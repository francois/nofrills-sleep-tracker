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

NoFrillsSleepTracker.renderAppAwake = function(rootNode, store, userId) {
  var napForm = document.createElement("form");
  napForm.action = "/me/" + userId;
  napForm.method = "post";
  napForm.appendChild(NoFrillsSleepTracker.createHiddenInput("new_state", "napping"));
  napForm.appendChild(NoFrillsSleepTracker.createHiddenInput("timezone", store.getItem("timezone") || "America/New_York"));
  napForm.appendChild(NoFrillsSleepTracker.createSubmitButton("Start Napping"));
  napForm.addEventListener("submit", function(ev) {
    store.setItem("start-nap-at-epoch", new Date().getTime());
    store.setItem("state", "napping");
  });

  var sleepForm = document.createElement("form");
  sleepForm.action = "/me/" + userId;
  sleepForm.method = "post";
  sleepForm.appendChild(NoFrillsSleepTracker.createHiddenInput("new_state", "sleeping"));
  sleepForm.appendChild(NoFrillsSleepTracker.createHiddenInput("timezone", store.getItem("timezone") || "America/New_York"));
  sleepForm.appendChild(NoFrillsSleepTracker.createSubmitButton("Start Sleeping"));
  sleepForm.addEventListener("submit", function(ev) {
    store.setItem("start-sleep-at-epoch", new Date().getTime());
    store.setItem("state", "sleeping");
  });

  var separator = document.createElement("p");
  separator.appendChild(document.createTextNode("OR"));

  rootNode.appendChild(napForm);
  rootNode.appendChild(separator);
  rootNode.appendChild(sleepForm);
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
      state.innerHTML = "Asleep for " + hours + " hours and " + Math.round(minutes) + " minutes";
    }
  }

  setTimeout(updateState, 0);
  var timerId = setInterval(updateState, 60000);

  var form = document.createElement("form");
  form.action = "/me/" + userId;
  form.method = "post";
  form.appendChild(NoFrillsSleepTracker.createHiddenInput("timezone", store.getItem("timezone") || "America/New_York"));
  form.appendChild(NoFrillsSleepTracker.createHiddenInput("new_state", "awake"));
  form.addEventListener("submit", function(ev) {
    store.setItem("state", "awake");
    store.removeItem("start-sleep-at-epoch");
    clearInterval(timerId);
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
      state.innerHTML = "Napped for " + minutes.toPrecision(1) + " minutes";
    }
  }

  setTimeout(updateState, 0);
  var timerId = setInterval(updateState, 15000);

  var form = document.createElement("form");
  form.action = "/me/" + userId;
  form.method = "post";
  form.appendChild(NoFrillsSleepTracker.createHiddenInput("timezone", store.getItem("timezone") || "America/New_York"));
  form.appendChild(NoFrillsSleepTracker.createHiddenInput("new_state", "awake"));
  form.addEventListener("submit", function(ev) {
    store.setItem("state", "awake");
    store.removeItem("start-nap-at-epoch");
    clearInterval(timerId);
  });
  form.appendChild(state);
  form.appendChild(NoFrillsSleepTracker.createSubmitButton("Wake from nap"));

  rootNode.appendChild(form);
}

NoFrillsSleepTracker.renderApp = function(rootNode, store, userId) {
  var timezone = store.getItem("timezone") || "America/New_York";
  var state = store.getItem("state") || "awake";

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
