var NoFrillsSleepTracker = NoFrillsSleepTracker || {};

NoFrillsSleepTracker.setTimezone = function(store, timezone) {
  store.setItem("timezone", timezone);
}

NoFrillsSleepTracker.createHiddenInput = function(name, value) {
  var node = document.createElement("input");
  node.type = "hidden";
  node.name = name;
  node.value = value;
  return node;
}

NoFrillsSleepTracker.createSubmitButton = function(text) {
  var button = document.createElement("button");
  button.type = "submit";
  button.appendChild(document.createTextNode(text));
  return button;
}

NoFrillsSleepTracker.createButton = function(text, clickFn) {
  var button = document.createElement("button");
  button.type = "button";
  button.appendChild(document.createTextNode(text));
  button.addEventListener("click", clickFn);
  return button;
}

NoFrillsSleepTracker.renderAppAwake = function(rootNode, store, userId) {
  rootNode.appendChild(NoFrillsSleepTracker.createButton("Start Napping",
        function(ev) {
          // prevent form submission
          ev.preventDefault();

          // change state
          store.setItem("start-nap-at-epoch", new Date().getTime());
          store.setItem("state", "napping");

          // rerender the app's UI
          setTimeout(NoFrillsSleepTracker.renderApp.bind(window, rootNode, store, userId), 0);
        }));

  var separator = document.createElement("p");
  separator.appendChild(document.createTextNode("OR"));
  rootNode.appendChild(separator);

  rootNode.appendChild(NoFrillsSleepTracker.createButton("Start Sleeping",
        function(ev) {
          // prevent form submission
          ev.preventDefault();

          // change state
          store.setItem("start-sleep-at-epoch", new Date().getTime());
          store.setItem("state", "sleeping");

          // rerender the app's UI
          setTimeout(NoFrillsSleepTracker.renderApp.bind(window, rootNode, store, userId), 0);
        }));
}

NoFrillsSleepTracker.renderAppSleeping = function(rootNode, store, userId) {
  var state = document.createElement("p");
  state.innerHTML = "";
  var updateState = function() {
    var startAt = store.getItem("start-sleep-at-epoch") || new Date().getTime();
    var now = new Date().getTime();
    var minutes = Math.floor((now - startAt) / 1000 / 60 * 10.0) / 10.0;
    var hours = Math.floor(minutes / 60.0);
    if (minutes < 2) {
      state.innerHTML = "Just fell asleep...";
    } else {
      state.innerHTML = "Asleep for " + hours.toFixed(0) + " hours and " + (minutes - 60 * hours).toFixed(0) + " minutes";
    }
  }

  setTimeout(updateState, 0);
  var timerId = setInterval(updateState, 60000);

  var form = document.createElement("form");
  form.action = "/me/" + userId;
  form.method = "post";
  form.appendChild(NoFrillsSleepTracker.createHiddenInput("timezone", store.getItem("timezone") || "America/New_York"));
  form.appendChild(NoFrillsSleepTracker.createHiddenInput("start_at", store.getItem("start-sleep-at-epoch") || new Date().getTime()));
  form.appendChild(NoFrillsSleepTracker.createHiddenInput("sleep_type", "night"));
  form.addEventListener("submit", function(ev) {
    clearInterval(timerId);
    form.appendChild(NoFrillsSleepTracker.createHiddenInput("end_at", new Date().getTime()));
    store.setItem("state", "awake");
    store.removeItem("start-sleep-at-epoch");
  });
  form.appendChild(state);
  form.appendChild(NoFrillsSleepTracker.createSubmitButton("Wake up!"));

  rootNode.appendChild(form);
}

NoFrillsSleepTracker.renderAppNapping = function(rootNode, store, userId) {
  var state = document.createElement("p");
  state.innerHTML = "";
  var updateState = function() {
    var startAt = store.getItem("start-nap-at-epoch") || new Date().getTime();
    var now = new Date().getTime();
    var minutes = Math.floor((now - startAt) / 1000 / 60 * 10.0) / 10.0;
    if (minutes < 0.5) {
      state.innerHTML = "Just started napping...";
    } else {
      state.innerHTML = "Napped for " + minutes.toFixed(1) + " minutes";
    }
  }

  setTimeout(updateState, 0);
  var timerId = setInterval(updateState, 15000);

  var form = document.createElement("form");
  form.action = "/me/" + userId;
  form.method = "post";
  form.appendChild(NoFrillsSleepTracker.createHiddenInput("timezone", store.getItem("timezone") || "America/New_York"));
  form.appendChild(NoFrillsSleepTracker.createHiddenInput("start_at", store.getItem("start-nap-at-epoch") || new Date().getTime()));
  form.appendChild(NoFrillsSleepTracker.createHiddenInput("sleep_type", "nap"));
  form.addEventListener("submit", function(ev) {
    clearInterval(timerId);
    form.appendChild(NoFrillsSleepTracker.createHiddenInput("end_at", new Date().getTime()));
    store.setItem("state", "awake");
    store.removeItem("start-nap-at-epoch");
  });
  form.appendChild(state);
  form.appendChild(NoFrillsSleepTracker.createSubmitButton("Wake from nap"));

  rootNode.appendChild(form);
}

NoFrillsSleepTracker.renderApp = function(rootNode, store, userId) {
  var timezone = store.getItem("timezone") || "America/New_York";
  var state = store.getItem("state") || "awake";

  rootNode.innerHTML = "";

  var stateNode = document.createElement("p");
  stateNode.appendChild(document.createTextNode("Current state: "));
  stateNode.appendChild(document.createTextNode(state));
  stateNode.appendChild(document.createTextNode("."));
  rootNode.appendChild(stateNode);

  if (state === "awake") {
    NoFrillsSleepTracker.renderAppAwake(rootNode, store, userId);
  } else if (state === "napping") {
    NoFrillsSleepTracker.renderAppNapping(rootNode, store, userId);
  } else if (state === "sleeping") {
    NoFrillsSleepTracker.renderAppSleeping(rootNode, store, userId);
  } else {
    throw new "ASSERTION ERROR: unknown state " + state + "; expected one of awake, napping or sleeping"
  }
}

NoFrillsSleepTracker.isLocalStorageSupported = function() {
  try {
    localStorage.setItem("test", "test");
    localStorage.removeItem("test");
    return true;
  } catch(e){
    return false;
  }
}

NoFrillsSleepTracker.renderLocalStorageDisabled = function(rootNode) {
  var p = document.createElement("p");
  p.innerHTML = "Uh ho... Local Storage is disabled. Are you trying to use this application when in private browsing mode? If so, disable private browsing then refresh this page.";
  rootNode.appendChild(p);
}
