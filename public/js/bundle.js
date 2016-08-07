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
  button.className = "button primary";
  return button;
}

NoFrillsSleepTracker.createButton = function(text, clickFn) {
  var button = document.createElement("button");
  button.type = "button";
  button.appendChild(document.createTextNode(text));
  button.addEventListener("click", clickFn);
  button.className = "button";
  return button;
}

NoFrillsSleepTracker.createRow = function() {
  var div = document.createElement("div");
  div.className = "row";
  return div;
}

NoFrillsSleepTracker.createColumn = function(size) {
  var div = document.createElement("div");
  div.className = size + " columns";
  return div;
}

NoFrillsSleepTracker.renderAppAwake = function(rootNode, store, userId, sleepTable) {
  var row = NoFrillsSleepTracker.createRow();
  var cell0 = NoFrillsSleepTracker.createColumn("small-5")
  var cell1 = NoFrillsSleepTracker.createColumn("small-2")
  var cell2 = NoFrillsSleepTracker.createColumn("small-5")
  cell0.appendChild(NoFrillsSleepTracker.createButton("Start Napping",
        function(ev) {
          // prevent form submission
          ev.preventDefault();

          // change state
          store.setItem("start-nap-at-epoch", new Date().getTime());
          store.setItem("state", "napping");

          // remove any pending "wakeup=1" param from the URL
          history.pushState(null, "", document.location.pathname);

          // rerender the app's UI
          setTimeout(NoFrillsSleepTracker.renderApp.bind(window, rootNode, store, userId), 0);
        }));

  cell1.appendChild(document.createTextNode("OR"));

  cell2.appendChild(NoFrillsSleepTracker.createButton("Start Sleeping",
        function(ev) {
          // prevent form submission
          ev.preventDefault();

          // change state
          store.setItem("start-sleep-at-epoch", new Date().getTime());
          store.setItem("state", "sleeping");

          // remove any pending "wakeup=1" param from the URL
          history.pushState(null, "", document.location.pathname);

          // rerender the app's UI
          setTimeout(NoFrillsSleepTracker.renderApp.bind(window, rootNode, store, userId), 0);
        }));

  row.appendChild(cell0);
  row.appendChild(cell1);
  row.appendChild(cell2);
  rootNode.appendChild(row);
  rootNode.appendChild(NoFrillsSleepTracker.renderSleepTable(sleepTable));
}

NoFrillsSleepTracker.renderAppSleeping = function(rootNode, store, userId, sleepTable) {
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
  });
  form.appendChild(state);
  form.appendChild(NoFrillsSleepTracker.createSubmitButton("Wake up!"));
  form.appendChild(document.createTextNode(" or "));
  form.appendChild(NoFrillsSleepTracker.createCancelLink("Cancel", "/me/" + userId + "?wakeup=1"));

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
  });
  form.appendChild(state);
  form.appendChild(NoFrillsSleepTracker.createSubmitButton("Wake from nap"));
  form.appendChild(document.createTextNode(" or "));
  form.appendChild(NoFrillsSleepTracker.createCancelLink("Cancel", "/me/" + userId + "?wakeup=1"));

  rootNode.appendChild(form);
}

NoFrillsSleepTracker.createCancelLink = function(label, href, fn) {
  var a = document.createElement("a");
  a.className = "button secondary";
  a.href = href;
  a.appendChild(document.createTextNode(label));
  if (typeof fn === "function") a.addEventListener("click", fn);
  return a;
}

NoFrillsSleepTracker.wakeUp = function(store) {
  store.setItem("state", "awake");
  store.removeItem("start-nap-at-epoch");
  store.removeItem("start-sleep-at-epoch");
}

NoFrillsSleepTracker.renderApp = function(rootNode, store, userId, sleepTable) {
  var timezone = store.getItem("timezone") || "America/New_York";
  var state = store.getItem("state") || "awake";

  rootNode.innerHTML = "";

  var header = document.createElement("h1");
  header.appendChild(document.createTextNode("Prepare to sleep"));
  rootNode.appendChild(header);

  if (state === "awake") {
    NoFrillsSleepTracker.renderAppAwake(rootNode, store, userId, sleepTable);
  } else if (state === "napping") {
    NoFrillsSleepTracker.renderAppNapping(rootNode, store, userId);
  } else if (state === "sleeping") {
    NoFrillsSleepTracker.renderAppSleeping(rootNode, store, userId);
  } else {
    throw new "ASSERTION ERROR: unknown state " + state + "; expected one of awake, napping or sleeping"
  }
}

NoFrillsSleepTracker.createHeaderCell = function(text) {
  var cell = document.createElement("th");
  cell.appendChild(document.createTextNode(text));
  return cell;
}

NoFrillsSleepTracker.createBodyCell = function(textOrHTMLNode) {
  var cell = document.createElement("td");
  if (typeof textOrHTMLNode === "object" && "appendChild" in textOrHTMLNode) {
    // we presume this is a DOM node
    cell.appendChild(textOrHTMLNode);
  } else {
    cell.appendChild(document.createTextNode(textOrHTMLNode));
  }
  return cell;
}

NoFrillsSleepTracker.renderSleepTable = function(sleepTable) {
  var table = document.createElement("table");
  table.className = "table";

  var caption = document.createElement("caption");
  caption.appendChild(document.createTextNode("Most recent sleep events"));
  var thead = document.createElement("thead");
  var headerRow = document.createElement("tr");
  thead.appendChild(headerRow);
  headerRow.appendChild(NoFrillsSleepTracker.createHeaderCell("DoW"));
  headerRow.appendChild(NoFrillsSleepTracker.createHeaderCell("Start"));
  headerRow.appendChild(NoFrillsSleepTracker.createHeaderCell("Wake"));
  headerRow.appendChild(NoFrillsSleepTracker.createHeaderCell("Duration"));

  var tbody = document.createElement("tbody");

  for(var i = 0; i < sleepTable.length; i++) {
    var sleepEvent = sleepTable[i];
    var bodyRow = document.createElement("tr");
    bodyRow.appendChild(NoFrillsSleepTracker.createBodyCell(sleepEvent.local_end_at.wday));
    bodyRow.appendChild(NoFrillsSleepTracker.createBodyCell(sleepEvent.local_start_at.time));
    bodyRow.appendChild(NoFrillsSleepTracker.createBodyCell(sleepEvent.local_end_at.time));
    bodyRow.appendChild(NoFrillsSleepTracker.createBodyCell(NoFrillsSleepTracker.createLink(sleepEvent.utc_duration, "/me/" + userId + "/" + sleepEvent.event_id)));
    tbody.appendChild(bodyRow);
  }

  table.appendChild(caption);
  table.appendChild(thead);
  table.appendChild(tbody);
  return table;
}

NoFrillsSleepTracker.createLink = function(label, href) {
  var anchor = document.createElement("a");
  anchor.appendChild(document.createTextNode(label));
  anchor.href = href;
  return anchor;
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
