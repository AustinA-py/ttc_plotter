/**
 * TTC Plotter - Main Application Logic
 * Handles user interface interactions and application flow
 */

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('TTC Plotter application starting...');
    
    // Initialize map
    initializeMap();
    
    // Setup sidebar functionality
    setupSidebar();
    
    // Setup search functionality
    setupSearch();
    
    // Setup tool buttons
    setupToolButtons();
    
    // Setup control buttons
    setupControlButtons();
    
    // Setup file operation buttons
    setupFileButtons();
    
    // Setup properties panel
    setupPropertiesPanel();
    
    // Setup TTC line drawing
    setupTTCLineDrawing();
    
    console.log('TTC Plotter application initialized');
});

// Setup sidebar functionality
function setupSidebar() {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarClose = document.getElementById('sidebar-close');
    const mainContent = document.getElementById('map-container');
    
    // Check if we're on mobile
    function isMobile() {
        return window.innerWidth <= 768;
    }
    
    // Initialize sidebar state based on screen size
    let isOpen = !isMobile(); // Open on desktop, closed on mobile
    
    // Set initial state
    function setInitialState() {
        if (isMobile()) {
            sidebar.classList.add('closed');
            mainContent.classList.add('sidebar-closed');
            isOpen = false;
        } else {
            sidebar.classList.remove('closed');
            mainContent.classList.remove('sidebar-closed');
            isOpen = true;
        }
    }
    
    // Toggle sidebar
    function toggleSidebar() {
        isOpen = !isOpen;
        
        if (isOpen) {
            sidebar.classList.remove('closed');
            if (!isMobile()) {
                mainContent.classList.remove('sidebar-closed');
            }
        } else {
            sidebar.classList.add('closed');
            mainContent.classList.add('sidebar-closed');
        }
        
        // Invalidate map size after sidebar animation
        setTimeout(() => {
            if (window.map) {
                map.invalidateSize();
            }
        }, 300);
    }
    
    // Set initial state
    setInitialState();
    
    // Event listeners
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }
    
    if (sidebarClose) {
        sidebarClose.addEventListener('click', toggleSidebar);
    }
    
    // Close sidebar on escape key (only on mobile)
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && isMobile() && isOpen) {
            toggleSidebar();
        }
    });
    
    // Handle resize events
    window.addEventListener('resize', function() {
        // Reset to appropriate state for current screen size
        setInitialState();
        
        // Invalidate map size
        setTimeout(() => {
            if (window.map) {
                map.invalidateSize();
            }
        }, 100);
    });
}

// Setup search functionality
function setupSearch() {
    const searchInput = document.getElementById('location-search');
    const searchButton = document.getElementById('search-button');
    const searchResults = document.getElementById('search-results');
    
    let searchTimeout;
    
    // Search on input
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            const query = this.value.trim();
            
            if (query.length > 2) {
                searchTimeout = setTimeout(() => {
                    performSearch(query);
                }, 500);
            } else {
                hideSearchResults();
            }
        });
        
        // Search on enter key
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = this.value.trim();
                if (query.length > 0) {
                    performSearch(query);
                }
            }
        });
    }
    
    // Search button click
    if (searchButton) {
        searchButton.addEventListener('click', function() {
            const query = searchInput.value.trim();
            if (query.length > 0) {
                performSearch(query);
            }
        });
    }
    
    // Hide search results when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-container')) {
            hideSearchResults();
        }
    });
}

// Perform search for location
async function performSearch(query) {
    const searchResults = document.getElementById('search-results');
    
    try {
        // Show loading state
        showSearchResults([{
            title: 'Searching...',
            subtitle: 'Please wait',
            loading: true
        }]);
        
        // Check if query looks like coordinates
        const coordMatch = query.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
        
        if (coordMatch) {
            // Handle coordinate search
            const lat = parseFloat(coordMatch[1]);
            const lng = parseFloat(coordMatch[2]);
            
            if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                const results = [{
                    title: `Coordinates: ${lat}, ${lng}`,
                    subtitle: 'Click to navigate to location',
                    lat: lat,
                    lng: lng
                }];
                showSearchResults(results);
            } else {
                showSearchResults([{
                    title: 'Invalid coordinates',
                    subtitle: 'Please enter valid latitude and longitude',
                    error: true
                }]);
            }
        } else {
            // Handle address search using Nominatim (OpenStreetMap)
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`);
            const data = await response.json();
            
            if (data && data.length > 0) {
                const results = data.map(item => ({
                    title: item.display_name.split(',')[0],
                    subtitle: item.display_name,
                    lat: parseFloat(item.lat),
                    lng: parseFloat(item.lon)
                }));
                showSearchResults(results);
            } else {
                showSearchResults([{
                    title: 'No results found',
                    subtitle: 'Try a different search term or coordinates',
                    error: true
                }]);
            }
        }
        
    } catch (error) {
        console.error('Search error:', error);
        showSearchResults([{
            title: 'Search error',
            subtitle: 'Unable to search at this time. Try again later.',
            error: true
        }]);
    }
}

// Show search results
function showSearchResults(results) {
    const searchResults = document.getElementById('search-results');
    
    if (!searchResults || !results || results.length === 0) {
        hideSearchResults();
        return;
    }
    
    searchResults.innerHTML = '';
    
    results.forEach(result => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        
        if (result.loading) {
            item.innerHTML = `
                <div class="search-result-title">${result.title}</div>
                <div class="search-result-subtitle">${result.subtitle}</div>
            `;
        } else if (result.error) {
            item.innerHTML = `
                <div class="search-result-title" style="color: #e74c3c;">${result.title}</div>
                <div class="search-result-subtitle">${result.subtitle}</div>
            `;
        } else {
            item.innerHTML = `
                <div class="search-result-title">${result.title}</div>
                <div class="search-result-subtitle">${result.subtitle}</div>
            `;
            
            item.addEventListener('click', function() {
                goToLocation(result.lat, result.lng, result.title);
                hideSearchResults();
                document.getElementById('location-search').value = result.title;
            });
        }
        
        searchResults.appendChild(item);
    });
    
    searchResults.classList.remove('hidden');
}

// Hide search results
function hideSearchResults() {
    const searchResults = document.getElementById('search-results');
    if (searchResults) {
        searchResults.classList.add('hidden');
    }
}

// Navigate to location
function goToLocation(lat, lng, title) {
    map.setView([lat, lng], 16);
    
    // Add a temporary marker
    const marker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup(`<b>${title || 'Search Result'}</b><br>Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}`)
        .openPopup();
    
    // Remove marker after 5 seconds
    setTimeout(() => {
        map.removeLayer(marker);
    }, 5000);
    
    showStatus(`Navigated to: ${title || 'Location'}`, 'success');
}

// Setup tool buttons
function setupToolButtons() {
    const toolButtons = [
        'work-location-polygon',
        'work-location-point', 
        'lane-closure',
        'taper',
        'buffer',
        'warning-sign'
    ];
    
    toolButtons.forEach(toolId => {
        const button = document.getElementById(toolId);
        if (button) {
            button.addEventListener('click', function() {
                selectTool(toolId);
            });
        }
    });
}

// Setup control buttons
function setupControlButtons() {
    // Delete mode button
    const deleteBtn = document.getElementById('delete-mode');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', function() {
            toggleDeleteMode();
        });
    }
    
    // Clear all button
    const clearBtn = document.getElementById('clear-all');
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            clearAllFeatures();
        });
    }
}

// Setup file operation buttons
function setupFileButtons() {
    // Load pattern button
    const loadBtn = document.getElementById('load-pattern');
    if (loadBtn) {
        loadBtn.addEventListener('click', function() {
            loadPattern();
        });
    }
    
    // Export pattern button
    const exportBtn = document.getElementById('export-pattern');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            exportPattern();
        });
    }
}

// Setup properties panel
function setupPropertiesPanel() {
    const closeBtn = document.getElementById('close-properties');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            console.log('Close button clicked'); // Debug statement
            
            // Clear current drawing tool
            if (typeof clearCurrentTool === 'function') {
                clearCurrentTool();
            }
            
            // Remove active class from all tool buttons
            document.querySelectorAll('.tool-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            if (typeof hideFeatureProperties === 'function') {
                hideFeatureProperties();
            } else {
                console.error('hideFeatureProperties function not found');
            }
        });
    }
    
    const applyBtn = document.getElementById('apply-properties');
    if (applyBtn) {
        applyBtn.addEventListener('click', function() {
            console.log('Apply button clicked'); // Debug statement
            console.log('applyFeatureProperties function exists:', typeof window.applyFeatureProperties); // Debug
            
            // Apply feature properties (this function will handle clearing tools and closing panel)
            if (typeof window.applyFeatureProperties === 'function') {
                console.log('Calling applyFeatureProperties...'); // Debug
                try {
                    window.applyFeatureProperties();
                    console.log('applyFeatureProperties call completed'); // Debug
                } catch (error) {
                    console.error('Error calling applyFeatureProperties:', error);
                    // Use fallback
                    console.log('Using fallback due to error...');
                    fallbackApply();
                }
            } else {
                console.error('applyFeatureProperties function not found on window object');
                console.error('Available functions on window:', Object.keys(window).filter(key => key.includes('Feature')));
                
                // Use fallback implementation
                console.log('Using fallback implementation...');
                fallbackApply();
            }
        });
    }
    
    // Fallback implementation
    function fallbackApply() {
        console.log('=== FALLBACK APPLY START ===');
        const panel = document.getElementById('properties-panel');
        const layer = panel?.currentLayer;
        
        if (layer && layer.ttcAttributes) {
            console.log('Applying properties for:', layer.ttcAttributes.type);
            
            // Update attributes based on feature type
            switch (layer.ttcAttributes.type) {
                case 'work-zone':
                    const title = document.getElementById('feature-title')?.value;
                    if (title) layer.ttcAttributes.title = title;
                    break;
                    
                case 'lane-closure':
                case 'taper':
                case 'buffer':
                    const position = document.getElementById('feature-position')?.value;
                    if (position) layer.ttcAttributes.position = position;
                    break;
                    
                case 'warning-sign':
                    const signType = document.getElementById('feature-sign-type')?.value;
                    if (signType) layer.ttcAttributes.signType = signType;
                    break;
            }
            
            // Update popup content if updateFeatureDisplay exists
            if (typeof window.updateFeatureDisplay === 'function') {
                window.updateFeatureDisplay(layer);
            }
            
            // Clear current tool
            if (typeof clearCurrentTool === 'function') {
                clearCurrentTool();
            }
            
            // Remove active class from all tool buttons
            document.querySelectorAll('.tool-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Hide the panel FORCEFULLY
            if (panel) {
                console.log('Hiding panel - classes before:', panel.className);
                console.log('Panel visible before:', !panel.classList.contains('hidden'));
                
                panel.classList.add('hidden');
                panel.style.display = 'none';
                panel.style.visibility = 'hidden';
                panel.currentLayer = null;
                
                console.log('Hiding panel - classes after:', panel.className);
                console.log('Panel visible after:', !panel.classList.contains('hidden'));
                console.log('Panel computed display:', window.getComputedStyle(panel).display);
                
                // Force browser to acknowledge the changes
                panel.offsetHeight;
                
                console.log('Panel should be hidden now');
            }
            
            // Reset status
            const measurementInfo = document.getElementById('measurement-info');
            if (measurementInfo) {
                measurementInfo.textContent = 'Measurement: --';
            }
            
            console.log('=== FALLBACK APPLY COMPLETE ===');
        } else {
            console.error('No layer or attributes found in fallback');
        }
    }
    
    const cancelBtn = document.getElementById('cancel-properties');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            console.log('Cancel button clicked'); // Debug statement
            
            // Clear current drawing tool
            if (typeof clearCurrentTool === 'function') {
                clearCurrentTool();
            }
            
            // Remove active class from all tool buttons
            document.querySelectorAll('.tool-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            if (typeof hideFeatureProperties === 'function') {
                hideFeatureProperties();
            } else {
                console.error('hideFeatureProperties function not found');
            }
        });
    }
}

// Select tool function
function selectTool(toolId) {
    // Clear any active drawing mode first (this will reset cursor)
    clearCurrentTool();
    
    // Remove active class from all tool buttons
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to selected tool
    const selectedBtn = document.getElementById(toolId);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
    
    // Set current tool (this will automatically start drawing mode for polygon/line tools and set cursor for point tools)
    setCurrentTool(toolId);
    
    console.log('Tool selected:', toolId);
}

// Toggle delete mode
function toggleDeleteMode() {
    const deleteBtn = document.getElementById('delete-mode');
    
    if (deleteBtn.classList.contains('active')) {
        // Disable delete mode
        deleteBtn.classList.remove('active');
        disableDeleteMode();
    } else {
        // Enable delete mode
        deleteBtn.classList.add('active');
        enableDeleteMode();
    }
}

// Enable delete mode
function enableDeleteMode() {
    clearCurrentTool();
    
    // Add click handler for deletion
    map.on('click', handleDeleteClick);
    
    // Change cursor
    document.getElementById('map').style.cursor = 'crosshair';
    
    console.log('Delete mode enabled');
}

// Disable delete mode
function disableDeleteMode() {
    map.off('click', handleDeleteClick);
    
    // Reset cursor
    document.getElementById('map').style.cursor = '';
    
    console.log('Delete mode disabled');
}

// Handle delete clicks
function handleDeleteClick(e) {
    // Find if we clicked on a feature
    let featureToDelete = null;
    
    drawnItems.eachLayer(function(layer) {
        if (layer.getBounds && layer.getBounds().contains(e.latlng)) {
            featureToDelete = layer;
        } else if (layer.getLatLng && map.distance(layer.getLatLng(), e.latlng) < 50) {
            featureToDelete = layer;
        }
    });
    
    if (featureToDelete) {
        if (confirm('Delete this feature?')) {
            // Remove label if it exists
            if (featureToDelete.labelMarker) {
                drawnItems.removeLayer(featureToDelete.labelMarker);
            }
            
            drawnItems.removeLayer(featureToDelete);
            
            // Remove from feature collections
            Object.keys(ttcFeatures).forEach(key => {
                const index = ttcFeatures[key].indexOf(featureToDelete);
                if (index > -1) {
                    ttcFeatures[key].splice(index, 1);
                }
            });
            
            updateFeatureCount();
            console.log('Feature deleted');
        }
    }
}

// Load pattern function
async function loadPattern() {
    try {
        const response = await fetch('/api/load-patterns');
        const result = await response.json();
        
        if (result.success) {
            // For now, just show a message since we don't have saved patterns yet
            alert('Load functionality will be implemented when patterns are saved to a database');
            
            // Example of how loading would work:
            // const selectedPattern = /* pattern selection logic */;
            // loadFeaturesFromGeoJSON(selectedPattern.features);
            // if (selectedPattern.bounds) {
            //     map.fitBounds(selectedPattern.bounds);
            // }
        } else {
            alert('Error loading patterns: ' + result.message);
        }
        
    } catch (error) {
        alert('Error loading patterns: ' + error.message);
        console.error('Load error:', error);
    }
}

// Export pattern function
async function exportPattern() {
    try {
        const exportFormat = prompt('Export format (json/geojson):', 'json');
        
        if (!exportFormat) return;
        
        const patternData = {
            format: exportFormat,
            features: getAllFeaturesAsGeoJSON(),
            bounds: map.getBounds(),
            exported: new Date().toISOString()
        };
        
        if (exportFormat.toLowerCase() === 'json' || exportFormat.toLowerCase() === 'geojson') {
            // Download as JSON file
            const dataStr = JSON.stringify(patternData, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `ttc-pattern-${new Date().toISOString().split('T')[0]}.${exportFormat}`;
            link.click();
            
            console.log('Pattern exported successfully');
        } else {
            // For other formats, use the API
            const response = await fetch('/api/export-pattern', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(patternData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('Export prepared: ' + result.message);
            } else {
                alert('Error exporting pattern: ' + result.message);
            }
        }
        
    } catch (error) {
        alert('Error exporting pattern: ' + error.message);
        console.error('Export error:', error);
    }
}

// Show properties panel for a feature
function showPropertiesPanel(feature) {
    const panel = document.getElementById('properties-panel');
    const content = document.getElementById('feature-properties');
    
    if (panel && content) {
        // Calculate feature measurements
        let measurements = calculateFeatureMeasurements(feature);
        
        // Populate feature properties
        content.innerHTML = `
            <div class="property-group">
                <label>Feature Type:</label>
                <span>${feature.ttcType || 'Unknown'}</span>
            </div>
            <div class="property-group">
                <label>Length (feet):</label>
                <input type="number" id="feature-length" value="${feature.fixedLength || measurements.length || ''}" ${feature.fixedLength ? '' : 'disabled'}>
            </div>
            <div class="property-group">
                <label>Bearing (degrees):</label>
                <input type="number" id="feature-bearing" value="${feature.bearing ? feature.bearing.toFixed(1) : ''}" ${feature.bearing !== undefined ? '' : 'disabled'}>
            </div>
            ${measurements.perimeter ? `
            <div class="property-group">
                <label>Perimeter (feet):</label>
                <span>${measurements.perimeter.toFixed(1)} ft</span>
            </div>` : ''}
            ${measurements.area ? `
            <div class="property-group">
                <label>Area (square feet):</label>
                <span>${measurements.area.toFixed(1)} sq ft</span>
            </div>` : ''}
            <div class="property-group">
                <label>Description:</label>
                <textarea id="feature-description" rows="3" placeholder="Enter description...">${feature.description || ''}</textarea>
            </div>
        `;
        
        panel.classList.remove('hidden');
        panel.currentFeature = feature;
    }
}

// Calculate feature measurements in feet
function calculateFeatureMeasurements(feature) {
    const measurements = {};
    
    if (feature.getLatLngs) {
        const latLngs = feature.getLatLngs();
        
        if (feature instanceof L.Polygon) {
            // Calculate perimeter and area for polygons
            const coords = Array.isArray(latLngs[0]) ? latLngs[0] : latLngs;
            
            // Perimeter calculation
            let perimeter = 0;
            for (let i = 0; i < coords.length; i++) {
                const nextIndex = (i + 1) % coords.length;
                perimeter += calculateDistance(coords[i], coords[nextIndex]);
            }
            measurements.perimeter = metersToFeet(perimeter);
            
            // Area calculation (approximate)
            if (coords.length >= 3) {
                // Using shoelace formula for area calculation
                let area = 0;
                const toRadians = (deg) => deg * Math.PI / 180;
                const earthRadius = 6371000; // meters
                
                for (let i = 0; i < coords.length; i++) {
                    const j = (i + 1) % coords.length;
                    const lat1 = toRadians(coords[i].lat);
                    const lat2 = toRadians(coords[j].lat);
                    const lng1 = toRadians(coords[i].lng);
                    const lng2 = toRadians(coords[j].lng);
                    
                    area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
                }
                
                area = Math.abs(area) * earthRadius * earthRadius / 2;
                measurements.area = area * 10.764; // Convert square meters to square feet
            }
            
        } else if (feature instanceof L.Polyline) {
            // Calculate length for polylines
            let length = 0;
            for (let i = 0; i < latLngs.length - 1; i++) {
                length += calculateDistance(latLngs[i], latLngs[i + 1]);
            }
            measurements.length = metersToFeet(length);
        }
    }
    
    return measurements;
}

// Hide properties panel
function hidePropertiesPanel() {
    const panel = document.getElementById('properties-panel');
    if (panel) {
        panel.classList.add('hidden');
        panel.currentFeature = null;
    }
}

// Apply feature properties (legacy - not used for TTC features)
function applyLegacyFeatureProperties() {
    const panel = document.getElementById('properties-panel');
    const feature = panel?.currentFeature;
    
    if (feature) {
        const description = document.getElementById('feature-description')?.value;
        const length = document.getElementById('feature-length')?.value;
        const bearing = document.getElementById('feature-bearing')?.value;
        
        // Update feature properties
        if (description) feature.description = description;
        if (length && feature.fixedLength) feature.fixedLength = parseFloat(length);
        if (bearing !== undefined && feature.bearing !== undefined) {
            feature.bearing = parseFloat(bearing);
            
            // Recalculate line if it's a line feature with fixed length
            if (feature.fixedLength && feature.setLatLngs) {
                const center = feature.getCenter ? feature.getCenter() : feature.getLatLngs()[0];
                const lengthMeters = feetToMeters(feature.fixedLength);
                const halfLength = lengthMeters / 2;
                
                const newStart = calculateDestination(center, halfLength, feature.bearing + 180);
                const newEnd = calculateDestination(center, halfLength, feature.bearing);
                
                feature.setLatLngs([newStart, newEnd]);
                updateHandlePositions(feature);
            }
        }
        
        hidePropertiesPanel();
        console.log('Feature properties updated');
    }
}

// Utility function to show status messages
function showStatus(message, type = 'info') {
    // Create a simple status notification
    const statusDiv = document.createElement('div');
    statusDiv.className = `status-message status-${type}`;
    statusDiv.textContent = message;
    
    document.body.appendChild(statusDiv);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (statusDiv.parentNode) {
            statusDiv.parentNode.removeChild(statusDiv);
        }
    }, 3000);
}