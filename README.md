# TTC Plotter

A Flask-based web application designed to help users generate maps and plots for temporary traffic control (TTC) plans.

## Overview

TTC Plotter is a web application that streamlines the process of creating visual representations for temporary traffic control plans. Whether you're planning construction zones, road maintenance, or special events, this tool provides an intuitive interface for generating professional maps and plots that meet traffic management requirements.

## Features

- **Interactive Map Generation**: Create detailed maps for temporary traffic control scenarios
- **Plot Visualization**: Generate various types of plots and diagrams for traffic control plans
- **Web-Based Interface**: Easy-to-use web interface accessible from any browser
- **Flask Framework**: Built with Python Flask for reliability and extensibility

## Technology Stack

- **Backend**: Python Flask
- **Frontend**: HTML, CSS, JavaScript
- **Mapping**: (To be implemented - likely using mapping libraries like Leaflet or Folium)
- **Plotting**: (To be implemented - likely using libraries like Matplotlib or Plotly)

## Getting Started

### Prerequisites

- Python 3.x
- Flask
- (Additional dependencies to be added as project develops)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd ttc_plotter
   ```

2. Install dependencies:
   ```bash
   pip install flask
   # Additional dependencies will be added to requirements.txt
   ```

3. Run the application:
   ```bash
   python app.py
   ```

4. Open your browser and navigate to `http://localhost:5000`

## Usage

### Creating and Configuring Features

TTC Plotter provides an interactive map interface for creating temporary traffic control features. Here's how to create and customize a feature:

1. **Create a Feature**: Select a tool from the sidebar (e.g., Work Zone, Lane Closure, Warning Sign) and draw the feature on the map by clicking or drawing lines/polygons as appropriate.

2. **Access Feature Properties**: Right-click on any created feature to open the Feature Properties panel, which allows you to configure the feature's attributes and appearance.

3. **Configure Attributes**: Each feature type has specific attributes you can set:
   - **Work Zones**: Set a descriptive title
   - **Lane Closures/Tapers/Buffers**: Choose position (Advanced or Post)
   - **Warning Signs**: Select sign type (Lane Closed, Shoulder Closed, Road Work Ahead)
   - **Work Points**: Set a descriptive title

4. **Customize Labels**: Expand the "Labeling Properties" section to adjust how feature labels appear on the map:
   - **Label Offset**: Control how far the label appears from the feature (available for most feature types)
   - **Label Font Size**: Adjust the text size of the label (available for all feature types)

5. **Real-time Preview**: All changes update the map instantly as you modify values, allowing you to see exactly how your feature will appear before finalizing.

6. **Apply Changes**: Click "Apply" to save your changes and close the properties panel.

**Example**: To create a work zone with a custom label, select the Work Zone tool, draw a polygon on the map, right-click the feature, enter "Main Street Construction" as the title, expand Labeling Properties to increase the font size to 14px, then click Apply to finalize the feature.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

For questions, suggestions, or contributions, visit: [https://AustinA-py.github.io](https://AustinA-py.github.io)