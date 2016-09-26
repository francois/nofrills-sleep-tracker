# No Frills Sleep Tracker Part 3: Client Side Framework

I currently own an iPhone 4S. This model is a bit slow with today's web sites. My goal was to have a very fast experience on this specific hardware. Since network latency is the killer, I had to reduce the amount of data *and* the number of requests. Ideally, I wanted to have a single file of each type: HTML, CSS and JS.

## Client-Side JavaScript Framework

Since I know I will sleep from home 95% of the time, meaning I'm on a fast Wifi connection, I still didn't want to have to wait for 200+ KB of data to come down the pipe before pressing "Start Sleeping". While I didn't have a specific budget for the total page size, I knew I didn't want to go much over 100 KB.

We use React at [Seevibes](http://seevibes.com/). While React is great, I knew it would blow my "budget". What I wanted was something that reused the same ideas, while being much lighter weight. Since I knew I wouldn't have that much code, I chose to hand-write everything. Regardless, the idea of a stateless view layer was important enough for me to do something similar to React. Data is passed into functions, which render DOM nodes accordingly. Since the app is also not highly interactive, I didn't need any kind of Shadow DOM. Doing straight DOM node manipulations was fine for me.

At the time of writing, a fresh download with no cache downloads 5 files for a total of 15.6 KB. The five files are 1 HTML, 2 CSS, 1 JS and 1 icon. Laziness keeps me from bundling the two CSS files together.
