/* Commit boundary for all inventory actions, including packaged receipts and stamps.
   Browser storage is not a multi-user database; rollback is best effort on quota errors. */
(() => {
  const execute = executeAction;
  const keys = [...Object.values(STORAGE), "b300_shared_stamp_inventory"];
  window.inventoryRevision = () =>
    JSON.stringify(keys.map((key) => localStorage.getItem(key)));
  window.withInventoryTransaction = function (operation) {
    const before = JSON.parse(JSON.stringify(state));
    const values = keys.map((key) => localStorage.getItem(key));
    try {
      return operation();
    } catch (error) {
      state = before;
      keys.forEach((key, index) => {
        if (localStorage.getItem(key) === values[index]) return;
        if (values[index] === null) localStorage.removeItem(key);
        else localStorage.setItem(key, values[index]);
      });
      throw error;
    }
  };
  executeAction = function (action, fd) {
    if (ui.actionRevision && ui.actionRevision !== window.inventoryRevision()) {
      throw Error(
        "Shared data changed while this form was open. Close and reopen the action before saving.",
      );
    }
    const batch = getBatch(fd.get("batchId") || ui.actionBatch);
    const product = fd.get("product") || batch?.product || ui.actionProduct;
    if (!PRODUCTS[product]) throw Error("Choose a valid product.");
    if (action !== "stamp" && !actionAllowed(product, action))
      throw Error("This action is not available for the selected product.");
    if (action === "receive" && !String(fd.get("party") || "").trim())
      throw Error("Enter a supplier.");
    if (action === "send" && !String(fd.get("party") || "").trim())
      throw Error("Enter a buyer.");
    if (fd.has("location") && !state.locations.includes(fd.get("location")))
      throw Error("Choose an existing storage location.");
    if (action === "process") {
      const allowed =
        product === "pi" ? ["extracts", "edible", "topicals"] : ["pi"];
      if (!allowed.includes(fd.get("outputProduct")))
        throw Error("Choose a valid processing output.");
    }
    if (
      action === "harvest" &&
      !["fm", "nfm"].includes(fd.get("outputProduct"))
    )
      throw Error("Choose flowering or non-flowering material.");
    if (
      action === "stamp" &&
      ![
        "Alberta",
        "British Columbia",
        "Manitoba",
        "New Brunswick",
        "Newfoundland and Labrador",
        "Northwest Territories",
        "Nova Scotia",
        "Nunavut",
        "Ontario",
        "Prince Edward Island",
        "Quebec",
        "Saskatchewan",
        "Yukon",
      ].includes(fd.get("jurisdiction"))
    )
      throw Error("Choose a valid stamp jurisdiction.");
    if (
      action === "lab" &&
      fd.get("labMode") === "record" &&
      (!String(fd.get("thc") || "").trim() ||
        !String(fd.get("document") || "").trim())
    )
      throw Error("Enter the THC result and COA reference.");
    if (action === "loss") {
      if (!String(fd.get("reason") || "").trim())
        throw Error("Enter a reason for the loss or destruction.");
      if (
        fd.get("lossMode") === "destroy" &&
        !String(fd.get("method") || "").trim()
      )
        throw Error("Enter the destruction method.");
      if (
        ["seeds", "vcp", "wcp"].includes(product) &&
        fd.get("lossMode") !== "destroy"
      )
        throw Error(
          "Plant and seed reductions must use destruction, not drying or processing loss.",
        );
    }
    return window.withInventoryTransaction(() => execute(action, fd));
  };
})();
