import Studio from "jsreport-studio";

Studio.initializeListeners.push(async () => {
  console.log("Doing some async initialization");
});

Studio.readyListeners.push(async () => {
  console.log("Studio is now rendered");
});
