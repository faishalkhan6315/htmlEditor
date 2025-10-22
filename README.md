# Visual HTML Editor

A powerful visual HTML editor built with React and Tailwind CSS that allows you to edit HTML content visually with a WYSIWYG interface.

## Features

- **Visual Editing**: Click on any element in the design area to select and edit it
- **Text Editing**: Edit text content directly with contentEditable
- **Image Replacement**: Upload images or use URLs to replace images
- **Layout Controls**: Apply flex layouts (row/column) to elements
- **Style Controls**: Change font size, background, padding, and more
- **Import/Export**: Import HTML files and export your edited content
- **Responsive Design**: Adjustable canvas width for different screen sizes
- **Real-time Preview**: See changes instantly in the iframe

## Project Structure

```
visual-html-editor/
├── src/
│   ├── components/
│   │   └── VisualHtmlEditor.jsx    # Main component
│   ├── utils/
│   │   └── iframeUtils.js          # Iframe management utilities
│   ├── index.css                   # Tailwind CSS imports
│   └── main.jsx                    # React entry point
├── index.html                      # HTML entry point
├── package.json                    # Dependencies
├── tailwind.config.js              # Tailwind configuration
├── postcss.config.js               # PostCSS configuration
├── vite.config.js                  # Vite configuration
└── README.md                       # This file
```

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

## Usage

### Basic Editing
1. Click on any element in the design area to select it
2. Use the control panel on the left to modify properties
3. Edit text directly by clicking on text elements
4. Replace images by uploading files or entering URLs

### Layout Controls
- **Flex Row**: Makes selected element a horizontal flex container
- **Flex Column**: Makes selected element a vertical flex container

### Style Controls
- **Font Size**: Set font size in pixels
- **Background**: Set background color (hex, rgb, or color names)
- **Padding**: Set padding in pixels
- **Text/HTML**: Edit the HTML content directly

### Import/Export
- **Import**: Load HTML files from your computer
- **Export**: Download the current HTML as a standalone file
- **Reload**: Reset to the original template

## Technical Details

### Architecture
- **React**: Component-based UI framework
- **Tailwind CSS**: Utility-first CSS framework
- **Vite**: Fast build tool and development server
- **Iframe**: Isolated editing environment for HTML content

### Key Components
- `VisualHtmlEditor.jsx`: Main React component with all UI logic
- `iframeUtils.js`: Utilities for iframe communication and DOM manipulation
- `index.css`: Tailwind CSS imports and custom styles

### Iframe Communication
The editor uses postMessage API to communicate between the main React app and the iframe content:
- Selection events
- Content changes
- Property updates
- Style applications

## Development

### File Structure
- **Components**: React components in `src/components/`
- **Utils**: Utility functions in `src/utils/`
- **Styles**: CSS and Tailwind configuration
- **Config**: Build and development configuration files

### Adding Features
1. Modify `VisualHtmlEditor.jsx` for UI changes
2. Update `iframeUtils.js` for iframe functionality
3. Add new utility functions as needed
4. Update styles in `index.css` or Tailwind config

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues or questions, please create an issue in the repository or contact the maintainer.
