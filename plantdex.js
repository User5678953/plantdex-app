// Global variables to track the current plant index, the last API response, API URL, and API Key
let currentPlantIndex = 0;
let lastAPIResponse;
const apiURL = 'https://perenual.com/api/species-list';
const apiKey = 'sk-tscM64c545f72b5721675';
let debounceTimeout;
const defaultImageURL = './img/plant_emoji.jpg'; // Path to your default image

// Execute when the document is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Get elements from the DOM
  const searchInput = document.getElementById('userSearchInput');
  const searchButton = document.getElementById('searchButton');
  const nextButton = document.getElementById('nextButton');
  const prevButton = document.getElementById('prevButton');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const errorDisplayLocation = document.querySelector('.error-message');

  // Theme switching mechanism
  const themeToggle = document.getElementById('themeToggle');
  // Array of theme class names to cycle through; note that the default theme has no extra class
  const themes = ['default', 'theme-light', 'theme-vibrant', 'theme-dark'];
  let currentThemeIndex = 0;

  themeToggle.addEventListener('click', () => {
    // Remove any theme classes from <html> (or <body>)
    document.documentElement.classList.remove(...themes.slice(1)); // Remove theme-light, theme-vibrant, and theme-dark

    // Cycle to the next theme
    currentThemeIndex = (currentThemeIndex + 1) % themes.length;
    const newTheme = themes[currentThemeIndex];

    // If the new theme is not 'default', add the class to the <html> element
    if (newTheme !== 'default') {
      document.documentElement.classList.add(newTheme);
    }
  });

  // Debounce function to limit the rate of API calls
  function debounce(func, delay) {
    return function(...args) {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => func.apply(this, args), delay);
    };
  }

  // Event listener for the search button click, performs the search operation
  searchButton.addEventListener('click', () => {
    performSearch(searchInput.value);
  });

  // Modified event listener for the search input with debounce
  searchInput.addEventListener('input', debounce(() => {
    performSearch(searchInput.value);
  }, 600)); // Increased debounce time

  // Event listener for the "next" button to show the next plant in the results
  nextButton.addEventListener('click', () => {
    if (currentPlantIndex < lastAPIResponse.data.length - 1) {
      currentPlantIndex++; // Increment the index
      displaySearchResults(lastAPIResponse, currentPlantIndex);
    }
  });

  // Event listener for the "previous" button to show the previous plant in the results
  prevButton.addEventListener('click', () => {
    if (currentPlantIndex > 0) {
      currentPlantIndex--; // Decrement the index
      displaySearchResults(lastAPIResponse, currentPlantIndex);
    }
  });

  // Show loading indicator during API calls
  function performSearch(query) {
    showLoadingIndicator(true);
    clearPreviousResults();
    
    fetch(`${apiURL}?key=${apiKey}&q=${query}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        showLoadingIndicator(false);
        console.log('API response data:', data); // Log the data to understand its structure
        lastAPIResponse = data; // Store API data
        currentPlantIndex = 0;
        displaySearchResults(data, currentPlantIndex);
      })
      .catch(error => {
        showLoadingIndicator(false);
        displayErrorMessage(error.message); // Call new function to display the error
        console.error('Error during fetch:', error);
      });
  }

  // New function to show API error messages in a red box
  function displayErrorMessage(message) {
    const errorBox = document.querySelector('.error-message');
    
    errorBox.textContent = message; // Set error text
    errorBox.style.display = 'block'; // Make it visible
  }

  // Function to display search results
  function displaySearchResults(data, index) {
    const searchResults = document.querySelector('.search-results');
    searchResults.innerHTML = ''; // Clear previous results

    if (!data.data || data.data.length === 0) {
      errorDisplayLocation.textContent = 'No results found.';
      return;
    }

    // Ensure the index is within the valid range
    index = Math.max(0, Math.min(index, data.data.length - 1));

    // Get the plant at the specified index
    const plant = data.data[index];

    // Display the results for the current plant
    const plantName = plant.common_name || 'Common Name not available';
    const scientificName = plant.scientific_name.join(', ') || 'Scientific Name not available';
    const sunlight = plant.sunlight[0] || 'Sunlight information not available';
    const watering = plant.watering || 'Watering information not available';

    // Check if medium_url exists, otherwise set a default image URL
    const imageURL = plant.default_image?.medium_url || defaultImageURL;

    // New result element for the current plant
    const resultElement = document.createElement('div');
    resultElement.classList.add('plant-result');

    resultElement.innerHTML = `
      <h2 class="plant-name">${plantName}</h2>
      <div class="image-container">
      <img src="${imageURL}" alt="${plantName} Image">
      <p class="default-image-message" style="display: none;">
      Sorry, we couldn't find a picture of <strong>${plantName}</strong>, but here's a cute lil' plant! 🌱
      </p>
      </div>
      <button class="get-details-button">🔍Details</button>
      <button class="image-button">📷Image</button>
      <button class="wiki-button">📖Wiki</button>
      <div class="plant-info">
      <p class="scientific-name"><strong>Scientific:</strong> ${scientificName}</p>
      <p class="sunlight"><span class="emoji">☀️</span> ${sunlight}</p>
      <p class="watering"><span class="emoji">💧</span> ${watering}</p>
      </div>
      <div class="plant-details" style="display: none;"></div>
    `;

    // Append the result element to the search results div
    searchResults.appendChild(resultElement);

    // Handle broken images
    const imgElement = resultElement.querySelector('img');
    const defaultMessage = resultElement.querySelector('.default-image-message');
    
    imgElement.onerror = function () {
      this.onerror = null; // Prevent infinite loop
      this.src = defaultImageURL;
      defaultMessage.style.display = 'block'; // Show the message when the default image is used
    };

    // Attach event listener for "Get Details" button
    const detailsButton = resultElement.querySelector('.get-details-button');
    const detailsContainer = resultElement.querySelector('.plant-details');

    detailsButton.addEventListener('click', () => {
      if (detailsContainer.innerHTML === '') {
        fetchPlantDetails(plant.id, detailsContainer);
      } else {
        detailsContainer.style.display = (detailsContainer.style.display === 'none') ? 'block' : 'none';
      }
    });

    // Attach event listener for "Image" button to open a Google Image search for the plant name
    const imageButton = resultElement.querySelector('.image-button');
    imageButton.addEventListener('click', () => {
      const query = encodeURIComponent(plantName);
      window.open(`https://www.google.com/search?tbm=isch&q=${query}`, '_blank');
    });

    // Attach event listener for "Wiki" button to open a Wikipedia search for the plant name
    const wikiButton = resultElement.querySelector('.wiki-button');
    wikiButton.addEventListener('click', () => {
      const query = encodeURIComponent(plantName);
      window.open(`https://en.wikipedia.org/wiki/Special:Search?search=${query}`, '_blank');
    });
  }

  // Function to fetch the details of a specific plant using its ID
  function fetchPlantDetails(plantId, displayElement) {
    const detailsURL = `https://perenual.com/api/species/details/${plantId}`;
    const url = new URL(detailsURL);
    url.searchParams.append('key', apiKey);

    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok.');
        }
        return response.json();
      })
      .then(plantDetails => {
        displayPlantDetails(plantDetails, displayElement); // Inject into the correct section
      })
      .catch(error => {
        console.error('Error Fetching Plant Details:', error);
        displayElement.innerHTML = `<p class="error-message">Failed to load details. Please try again.</p>`;
      });
  }

  // Function to display the plant details in the provided element
  function displayPlantDetails(plantDetails, plantDetailsElement) {
    if (!plantDetails || Object.keys(plantDetails).length === 0) {
      plantDetailsElement.innerHTML = '<p>No details available for this plant.</p>';
      return;
    }

    // Create the details section
    const detailsHTML = `
      <h3>Plant Details</h3>
      <p><strong>Common Name:</strong> ${plantDetails.common_name || 'Not available'}</p>
      <p><strong>Scientific Name:</strong> ${plantDetails.scientific_name?.join(', ') || 'Not available'}</p>
      <p><strong>Family:</strong> ${plantDetails.family || 'Not available'}</p>
      <p><strong>Care Level:</strong> ${plantDetails.care_level || 'Not available'}</p>
      <p><strong>Cycle:</strong> ${plantDetails.cycle || 'Not available'}</p>
      <p><strong>Description:</strong> ${plantDetails.description || 'Not available'}</p>
    `;

    plantDetailsElement.innerHTML = detailsHTML;
    plantDetailsElement.style.display = 'block'; // Ensure visibility
  }

  // Function to show or hide the loading indicator
  function showLoadingIndicator(show) {
    loadingIndicator.style.display = show ? 'block' : 'none';
  }

  // Function to clear previous search results
  function clearPreviousResults() {
    const searchResultsDisplayLocation = document.querySelector('.search-results');
    const errorBox = document.querySelector('.error-message');

    searchResultsDisplayLocation.innerHTML = ''; 
    errorBox.textContent = ''; // Clear previous error
    errorBox.style.display = 'none'; // Hide error box
  }
});