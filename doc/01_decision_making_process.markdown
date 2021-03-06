# No Frills Sleep Tracker Part 1: Decision Making Process

Being unsatisfied with the sleep tracker apps I used previously, I chose to write my own. In this series of articles, I'd like to document the decision making process I used, in order to help other people struggling with the same types of decisions.

<dl>
<dt>Buy or build?</dt>
<dd>
  <p>Well&hellip; that decision had been done a few times over. Reasons why I chose to build instead of buy include:</p>
  <ul>
    <li>Too many bells &amp; whistles, things which I didn't need (cardio meter on wakeup? fun, but not required);</li>
    <li>Graphs are cool, but only if they have the data I want, I want a histogram of number of hours slept, not a simple average;</li>
    <li>I don't need an alarm clock, iOS already does that for me;</li>
    <li>By the same token, I don't need a music player. I have a playlist whose duration is 21 minutes, the time it takes me to fall asleep;</li>
    <li>Privacy invasion: sign up with Facebook, tie an identity to an account. Not for me, thanks;</li>
    <li>Naps? Have you never heard of them? Most apps assume people sleep only once per day. I like my naps, thank you very much. Let me track them as just another sleep during the day;</li>
    <li>I could use the opportunity to do UX design, which I don't do much of at <a href="http://seevibes.com/">Seevibes</a>.</li>
  </ul>
</dd>

<dt>App or web site?</dt>
<dd>
  <p>I knew iOS offers ways to run web sites with a feel that's to an app experience.</p>
  <p>I also didn't want to pony up money just to track my sleep. Call me a cheap stake.</p>
</dd>

<dt>Open or closed source?</dt>
<dd>
  <p>Ah, that decision was quickly taken: open source it is. 3-clause BSD/MIT license it was. Going open source also offered me the reason to start blogging again.</p>
</dd>

<dt>Host myself (Digital Ocean, Vultr, AWS, etc) or PaaS (Heroku, Google App Engine)?</dt>
<dd>
  <p>It had been a long time since I had deployed to Heroku. More than 5 years, in fact. I wanted to see how the Heroku ecosystem had evolved since then. Besides, I maintain servers during my day-job, so I didn't want to have to do that again.</p>
  <p>While I'm testing, I'm fine with Heroku's free dyno that sleeps. Now that I've opened the can of worms and I'm showing the app to other people, I'll pay for a hobby plan, for a month or two. I'll see how that goes.</p>
</dd>

<dt>Multitenant or single user?</dt>
<dd>
  <p>That was a fun decision! Going single user meant that I would be alone to pay for the app's hosting. If I went multitenant, I could have a "product" that other people could use, and maybe even donate. In the end, even if I was the sole user, I chose to go multitenant, for the learning experience. Designing for other people is different than designing for oneself only.</p>
  <p>Being multitenant did not preclude going single-user: simply hide the instance behind a Basic Auth wall and that's it.</p>
</dd>

<dt>Real notion of a user or fully anonymous?</dt>
<dd>
  <p>One of my gripes is the invasion of privacy. I chose to make the app fully anonymous: there are no ways for me (or any admin) to attach an identity to a sleeping pattern.</p>
</dd>

<dt>Server-side or client-side application? Single-page app?</dt>
<dd>
  <p>I like the simplicity of having my data saved to the cloud. That indicated I should have some kind of cloud storage, or a server-side component. In part 2, I will describe more of the decision process I went through on this part.</p>
  <p>In the end, I chose a hybrid solution: the server is responsible for long-term state storage and data aggregation (graphs). The client is responsible for short-term storage: start nap/night, end nap/night. I used <a href="https://developer.mozilla.org/en-US/docs/Web/API/Storage/LocalStorage">localStorage</a> to store short-term data.</p>
  <p>I specifically chose <strong>not</strong> to use React, because the library is too large for my end-goal: fast start and rendering on iPhone 4S (I didn't try it, but the minified React JS alone is larger than the JS + CSS I ended up writing; 145 kB vs 56 kB, with 44 kB of that being the minified custom Foundation framework build I used). That is not to say the React model isn't good: I used a stateless view layer in the code, which made rendering and state changes a breeze.</p>
</dd>
</dl>

If you want to use the app, please do so! It's available at <a href="http://app.nofrills-sleep-tracker.com/">app.nofrills-sleep-tracker.com</a>. Happy sleeping!
