// This script runs on every webpage to detect and process recipes

// Configuration - common recipe container selectors
const RECIPE_SELECTORS = [
    // Common recipe card selectors
    '.recipe-card',
    '.recipe-content',
    '.recipe-instructions',
    '.recipe',
    '.wprm-recipe-container',
    '.tasty-recipes',
    '.recipe-body',
    '.recipe-container',
    '.rll-recipe',
    '.mv-recipe-card',
    '[itemprop="recipeInstructions"]',
    '[itemtype*="Recipe"]',
    // Common ingredient list selectors
    '.ingredients-list',
    '.ingredient-list',
    '.wprm-recipe-ingredients',
    '.ingredients',
    // Common instruction selectors
    '.instructions',
    '.steps',
    '.directions',
    '.method'
  ];
  
  // Check if we're on a likely recipe page
  function isRecipePage() {
    const url = window.location.href.toLowerCase();
    const title = document.title.toLowerCase();
    
    // Check URL and title for recipe-related terms
    const recipeTerms = ['recipe', 'cook', 'bake', 'food', 'dish', 'meal'];
    const hasRecipeTerm = recipeTerms.some(term => url.includes(term) || title.includes(term));
    
    // Check for structured data marking
    const hasRecipeSchema = document.querySelector('[itemtype*="Recipe"]') !== null;
    
    // Check for common recipe site domains
    const recipeDomainsPatterns = [
      'allrecipes.com',
      'foodnetwork.com',
      'epicurious.com',
      'simplyrecipes.com',
      'seriouseats.com',
      'taste.com',
      'delish.com',
      'bbcgoodfood.com',
      'food52.com',
      'bonappetit.com'
    ];
    
    const isRecipeDomain = recipeDomainsPatterns.some(domain => url.includes(domain));
    
    return hasRecipeTerm || hasRecipeSchema || isRecipeDomain;
  }
  
  // Find the recipe container element
  function findRecipeContainer() {
    for (const selector of RECIPE_SELECTORS) {
      const element = document.querySelector(selector);
      if (element) {
        return element;
      }
    }
    
    // If no specific recipe container found, look for lists that might be ingredients
    const possibleIngredientLists = Array.from(document.querySelectorAll('ul, ol')).filter(list => {
      // Ingredients lists often have 5+ short items
      if (list.children.length < 5) return false;
      
      // Check if list items are short (likely ingredients)
      const shortItems = Array.from(list.children).filter(item => 
        item.textContent.trim().length < 100 && 
        item.textContent.includes(' ')
      );
      
      return shortItems.length >= 5;
    });
    
    if (possibleIngredientLists.length > 0) {
      // Look for the closest heading to this list
      const potentialContainer = possibleIngredientLists[0].closest('section, div, article');
      if (potentialContainer) {
        return potentialContainer;
      }
      return possibleIngredientLists[0].parentElement;
    }
    
    return null;
  }
  
  // Extract just the recipe content for clean display
  function extractRecipe(container) {
    if (!container) return null;
    
    const recipe = {
      title: '',
      ingredients: [],
      instructions: [],
      notes: ''
    };
    
    // Try to find the recipe title
    const possibleTitles = container.closest('article, section, div')?.querySelectorAll('h1, h2');
    if (possibleTitles && possibleTitles.length > 0) {
      recipe.title = possibleTitles[0].textContent.trim();
    }
    
    // Find ingredients
    const ingredientLists = container.querySelectorAll('ul, .ingredients, [itemprop="recipeIngredient"]');
    ingredientLists.forEach(list => {
      const items = list.querySelectorAll('li');
      items.forEach(item => {
        const text = item.textContent.trim();
        if (text && text.length < 200) {  // Avoid huge paragraphs
          recipe.ingredients.push(text);
        }
      });
    });
    
    // Find instructions
    const instructionLists = container.querySelectorAll('ol, .instructions, .steps, [itemprop="recipeInstructions"]');
    instructionLists.forEach(list => {
      const items = list.querySelectorAll('li, p');
      items.forEach(item => {
        const text = item.textContent.trim();
        if (text && text.length > 5) {  // Avoid empty or very short items
          recipe.instructions.push(text);
        }
        if (item.classList.contains('dsps-network-count') || 
            item.querySelector('.dsps-network-count') !== null) {
          recipe.instructions.push('Error line here')
        }
      });
    });
    
    return recipe;
  }
  
  // Scroll to the recipe section
  function scrollToRecipe(element) {
    if (!element) return false;
    
    // Calculate position to scroll to (slightly above the element)
    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const targetPosition = scrollTop + rect.top - 100;  // 100px above element
    
    // Smooth scroll
    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth'
    });
    
    // Highlight the recipe section briefly
    const originalBackgroundColor = element.style.backgroundColor;
    element.style.backgroundColor = '#ffffcc';
    setTimeout(() => {
      element.style.backgroundColor = originalBackgroundColor;
    }, 2000);
    
    return true;
  }
  
  // Create a clean recipe display
  function showExtractedRecipe(recipe) {
    // Remove any existing recipe overlay
    const existingOverlay = document.getElementById('recipe-skipper-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'recipe-skipper-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 50px;
      right: 50px;
      width: 400px;
      max-height: 80vh;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      z-index: 9999;
      padding: 20px;
      overflow-y: auto;
      font-family: Arial, sans-serif;
    `;
    
    // Add content
    let content = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
        <h2 style="margin: 0; color: #333;">${recipe.title || 'Recipe'}</h2>
        <button id="close-recipe-overlay" style="background: none; border: none; font-size: 20px; cursor: pointer;">×</button>
      </div>
      
      <h3 style="color: #4CAF50; margin-top: 20px;">Ingredients</h3>
      <ul style="padding-left: 20px;">
    `;
    
    recipe.ingredients.forEach(ingredient => {
      content += `<li style="margin-bottom: 5px;">${ingredient}</li>`;
    });
    
    content += `
      </ul>
      
      <h3 style="color: #4CAF50; margin-top: 20px;">Instructions</h3>
      <ol style="padding-left: 20px;">
    `;
    
    recipe.instructions.forEach(instruction => {
      content += `<li style="margin-bottom: 10px;">${instruction}</li>`;
    });
    
    content += `
      </ol>
      
      <div style="margin-top: 20px; text-align: center;">
        <button id="print-recipe" style="background-color: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Print Recipe</button>
      </div>
    `;
    
    overlay.innerHTML = content;
    document.body.appendChild(overlay);
    
    // Add event listeners
    document.getElementById('close-recipe-overlay').addEventListener('click', () => {
      overlay.remove();
    });
    
    document.getElementById('print-recipe').addEventListener('click', () => {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
        <head>
          <title>${recipe.title || 'Recipe'}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { text-align: center; }
            ul, ol { padding-left: 20px; }
            li { margin-bottom: 8px; }
          </style>
        </head>
        <body>
          <h1>${recipe.title || 'Recipe'}</h1>
          
          <h2>Ingredients</h2>
          <ul>
            ${recipe.ingredients.map(item => `<li>${item}</li>`).join('')}
          </ul>
          
          <h2>Instructions</h2>
          <ol>
            ${recipe.instructions.map(item => `<li>${item}</li>`).join('')}
          </ol>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    });
    
    return true;
  }
  
  // Main function to handle finding and displaying recipe
  function processRecipe() {
    // Check if this is likely a recipe page
    if (!isRecipePage()) {
      console.log("Recipe Skipper: This doesn't appear to be a recipe page.");
      return false;
    }
    
    // Find the recipe container
    const recipeContainer = findRecipeContainer();
    if (!recipeContainer) {
      console.log("Recipe Skipper: Couldn't find a recipe on this page.");
      return false;
    }
    
    // Get user preferences
    chrome.storage.sync.get({
      autoScroll: true,
      extractRecipe: false
    }, function(items) {
      // Scroll to recipe if option enabled
      if (items.autoScroll) {
        scrollToRecipe(recipeContainer);
      }
      
      // Extract and display recipe if option enabled
      if (items.extractRecipe) {
        const extractedRecipe = extractRecipe(recipeContainer);
        if (extractedRecipe && 
            (extractedRecipe.ingredients.length > 0 || extractedRecipe.instructions.length > 0)) {
          showExtractedRecipe(extractedRecipe);
        }
      }
    });
    
    return true;
  }
  
  // Auto-run when page loads (if setting enabled)
  chrome.storage.sync.get({
    autoScroll: true
  }, function(items) {
    if (items.autoScroll) {
      // Wait for page to fully load
      setTimeout(processRecipe, 1500);
    }
  });
  
  // Listen for messages from popup
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "findRecipe") {
      const success = processRecipe();
      sendResponse({success: success});
    }
    return true;
  });