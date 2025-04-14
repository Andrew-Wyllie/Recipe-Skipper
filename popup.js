document.addEventListener('DOMContentLoaded', function() {
    // Load saved settings
    chrome.storage.sync.get({
      autoScroll: true,
      extractRecipe: false
    }, function(items) {
      document.getElementById('autoScrollToggle').checked = items.autoScroll;
      document.getElementById('extractToggle').checked = items.extractRecipe;
    });
    
    // Save settings when changed
    document.getElementById('autoScrollToggle').addEventListener('change', function() {
      chrome.storage.sync.set({
        autoScroll: this.checked
      });
    });
    
    document.getElementById('extractToggle').addEventListener('change', function() {
      chrome.storage.sync.set({
        extractRecipe: this.checked
      });
    });
    
    // Handle find recipe button click
    document.getElementById('findRecipeBtn').addEventListener('click', function() {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "findRecipe"}, function(response) {
          if (response && response.success) {
            document.getElementById('status').textContent = "Recipe found!";
          } else {
            document.getElementById('status').textContent = "No recipe found on this page.";
          }
        });
      });
    });
  });