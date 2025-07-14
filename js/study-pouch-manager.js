// Study Pouch Manager - Dynamic Widget System
// Handles draggable components with flexible layout

class StudyPouchManager {
    constructor() {
        console.log('StudyPouchManager constructor starting...');
        this.isVisible = false;
        this.container = null;
        this.components = new Map();
        this.draggedComponent = null;
        this.currentTheme = 'blue'; // Use valid glass theme name
        this.layout = {
            columns: 'auto',
            gap: 16,
            padding: 20
        };
        
        this.init();
        console.log('StudyPouchManager constructor completed, container:', this.container);
    }

    init() {
        this.createPouchContainer();
        this.setupEventListeners();
        
        // Delay component registration to ensure all scripts are loaded
        setTimeout(() => {
            this.registerComponents();
            this.addDefaultComponents();
        }, 100);
    }

    addDefaultComponents() {
        // Add default components if none exist
        if (this.components.size === 0) {
            console.log('Adding default Study Pouch components...');
            this.addComponent('notepad');
            this.addComponent('pomodoro');
            this.addComponent('music');
            this.addComponent('video-library');
            this.addComponent('calculator');
            this.addComponent('task-tracker');
            console.log('Default components added:', this.components.size);
        }
    }

    createPouchContainer() {
        this.container = document.createElement('div');
        this.container.className = 'kana-study-pouch';
        this.container.innerHTML = `
            <div class="study-pouch-header">
                <div class="pouch-title">
                    <span class="pouch-icon">🎒</span>
                    Study Pouch
                </div>
                <div class="pouch-controls">
                    <button class="pouch-add-btn" title="Add Component">+</button>
                    <button class="pouch-close-btn" title="Close">×</button>
                </div>
            </div>
            <div class="study-pouch-content">
                <div class="components-grid" id="study-components-grid">
                    <!-- Dynamic components will be inserted here -->
                </div>
                <div class="add-component-zone" style="display: none;">
                    <div class="component-selector">
                        <div class="selector-title">Add Component</div>
                        <div class="component-options">
                            <div class="component-option" data-type="notepad">
                                <span class="component-icon">📝</span>
                                <span class="component-name">Notepad</span>
                            </div>
                            <div class="component-option" data-type="pomodoro">
                                <span class="component-icon">⏱️</span>
                                <span class="component-name">Pomodoro</span>
                            </div>
                            <div class="component-option" data-type="music">
                                <span class="component-icon">🎵</span>
                                <span class="component-name">Music Player</span>
                            </div>
                            <div class="component-option" data-type="video-library">
                                <span class="component-icon">📹</span>
                                <span class="component-name">Video Library</span>
                            </div>
                            <div class="component-option" data-type="calculator">
                                <span class="component-icon">🧮</span>
                                <span class="component-name">Calculator</span>
                            </div>
                            <div class="component-option" data-type="task-tracker">
                                <span class="component-icon">✅</span>
                                <span class="component-name">Task Tracker</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Position the container off-screen initially
        this.container.style.cssText = `
            position: fixed;
            top: 50%;
            right: -400px;
            width: 380px;
            max-height: 70vh;
            transform: translateY(-50%);
            z-index: 2147483645;
            transition: right 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        `;

        document.body.appendChild(this.container);
        this.setupDragAndDrop();
    }

    setupEventListeners() {
        // Close button
        this.container.querySelector('.pouch-close-btn').addEventListener('click', () => {
            this.hide();
        });

        // Add component button
        this.container.querySelector('.pouch-add-btn').addEventListener('click', () => {
            this.toggleComponentSelector();
        });

        // Component selection
        this.container.querySelectorAll('.component-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const componentType = e.currentTarget.dataset.type;
                this.addComponent(componentType);
                this.hideComponentSelector();
            });
        });
    }

    setupDragAndDrop() {
        const grid = this.container.querySelector('.components-grid');
        
        // Allow dropping components back into the grid
        grid.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        grid.addEventListener('drop', (e) => {
            e.preventDefault();
            if (this.draggedComponent) {
                this.returnComponentToPouch(this.draggedComponent);
            }
        });
    }

    registerComponents() {
        // Register all available component types with safety checks
        this.componentTypes = {};
        
        // Check if components are available before registering
        if (typeof StudyNotepadComponent !== 'undefined') {
            this.componentTypes['notepad'] = StudyNotepadComponent;
        }
        if (typeof StudyPomodoroComponent !== 'undefined') {
            this.componentTypes['pomodoro'] = StudyPomodoroComponent;
        }
        if (typeof StudyMusicComponent !== 'undefined') {
            this.componentTypes['music'] = StudyMusicComponent;
        }
        if (typeof StudyVideoLibraryComponent !== 'undefined') {
            this.componentTypes['video-library'] = StudyVideoLibraryComponent;
        }
        if (typeof StudyCalculatorComponent !== 'undefined') {
            this.componentTypes['calculator'] = StudyCalculatorComponent;
        }
        if (typeof StudyTaskTrackerComponent !== 'undefined') {
            this.componentTypes['task-tracker'] = StudyTaskTrackerComponent;
        }
        
        console.log('Registered component types:', Object.keys(this.componentTypes));
    }

    show() {
        console.log('StudyPouchManager show method called');
        this.isVisible = true;
        this.container.style.right = '20px';
        console.log('Set container right to 20px, container:', this.container);
        this.applyTheme();
    }

    hide() {
        this.isVisible = false;
        this.container.style.right = '-400px';
        this.hideComponentSelector();
    }

    toggle() {
        console.log('StudyPouchManager toggle called, current isVisible:', this.isVisible);
        console.log('Container element:', this.container);
        
        if (this.isVisible) {
            console.log('Hiding Study Pouch...');
            this.hide();
        } else {
            console.log('Showing Study Pouch...');
            this.show();
        }
    }

    toggleComponentSelector() {
        const selector = this.container.querySelector('.add-component-zone');
        const isVisible = selector.style.display !== 'none';
        selector.style.display = isVisible ? 'none' : 'block';
    }

    hideComponentSelector() {
        const selector = this.container.querySelector('.add-component-zone');
        selector.style.display = 'none';
    }

    addComponent(type) {
        const ComponentClass = this.componentTypes[type];
        if (!ComponentClass) {
            console.warn('Unknown component type:', type);
            return;
        }

        const componentId = `${type}-${Date.now()}`;
        const component = new ComponentClass(componentId, this, type);
        
        this.components.set(componentId, component);
        this.renderComponent(component);
        
        // Apply current theme to new component after a short delay to ensure element exists
        setTimeout(() => {
            if (component && typeof component.applyTheme === 'function') {
                component.applyTheme(this.currentTheme);
            }
        }, 10);
        
        return component;
    }

    removeComponent(componentId) {
        const component = this.components.get(componentId);
        if (component) {
            component.destroy();
            this.components.delete(componentId);
            this.updateLayout();
        }
    }

    renderComponent(component) {
        const grid = this.container.querySelector('.components-grid');
        const componentElement = component.render();
        
        grid.appendChild(componentElement);
        this.updateLayout();
    }

    updateLayout() {
        const grid = this.container.querySelector('.components-grid');
        const componentCount = this.components.size;
        
        // Dynamic grid columns based on component count
        let columns;
        if (componentCount <= 2) {
            columns = '1fr';
        } else if (componentCount <= 4) {
            columns = 'repeat(2, 1fr)';
        } else if (componentCount <= 6) {
            columns = 'repeat(3, 1fr)';
        } else {
            columns = 'repeat(auto-fit, minmax(120px, 1fr))';
        }
        
        grid.style.gridTemplateColumns = columns;
    }

    // Component dragging methods
    startComponentDrag(component, event) {
        this.draggedComponent = component;
        
        // Create floating version of component
        const floatingComponent = component.createFloatingVersion();
        document.body.appendChild(floatingComponent);
        
        // Remove from grid temporarily
        component.element.style.opacity = '0.3';
        
        this.handleComponentDrag(floatingComponent, event);
    }

    handleComponentDrag(floatingElement, initialEvent) {
        let isDragging = true;
        const startX = initialEvent.clientX;
        const startY = initialEvent.clientY;
        
        // Position floating element at cursor
        floatingElement.style.left = startX + 'px';
        floatingElement.style.top = startY + 'px';
        
        const onMouseMove = (e) => {
            if (!isDragging) return;
            
            floatingElement.style.left = (e.clientX - 50) + 'px';
            floatingElement.style.top = (e.clientY - 50) + 'px';
        };
        
        const onMouseUp = (e) => {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            
            // Always clean up the floating element
            if (floatingElement && floatingElement.parentNode) {
                floatingElement.remove();
            }
            
            // Check if we still have a dragged component
            if (!this.draggedComponent) {
                return;
            }
            
            // Check if dropped outside pouch
            const pouchRect = this.container.getBoundingClientRect();
            const isOutside = e.clientX < pouchRect.left || 
                            e.clientX > pouchRect.right || 
                            e.clientY < pouchRect.top || 
                            e.clientY > pouchRect.bottom;
            
            if (isOutside) {
                this.ejectComponent(this.draggedComponent, e.clientX, e.clientY);
            } else {
                this.returnComponentToPouch(this.draggedComponent);
            }
            
            this.draggedComponent = null;
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    ejectComponent(component, x, y) {
        // Create standalone floating version
        const standaloneComponent = component.createStandaloneVersion();
        standaloneComponent.style.position = 'fixed';
        standaloneComponent.style.left = Math.max(20, Math.min(x - 150, window.innerWidth - 320)) + 'px';
        standaloneComponent.style.top = Math.max(20, Math.min(y - 100, window.innerHeight - 400)) + 'px';
        standaloneComponent.style.zIndex = '2147483646';
        
        document.body.appendChild(standaloneComponent);
        
        // Remove from pouch
        component.element.remove();
        component.isStandalone = true;
        component.standaloneElement = standaloneComponent;
        
        // Make standalone draggable
        this.makeStandaloneDraggable(component);
        
        // Apply theme to standalone
        component.applyTheme(this.currentTheme);
        
        // Auto-open the component in expanded state
        component.openStandalone();
        
        this.updateLayout();
    }

    returnComponentToPouch(component) {
        if (!component) {
            console.warn('Attempted to return null component to pouch');
            return;
        }
        
        if (component.isStandalone && component.standaloneElement) {
            // Clean up standalone element properly
            if (component.standaloneElement.parentNode) {
                component.standaloneElement.remove();
            }
            component.isStandalone = false;
            component.standaloneElement = null;
        }
        
        // Ensure the component is back in the pouch
        if (component.element && !component.element.parentNode) {
            this.renderComponent(component);
        } else if (component.element) {
            component.element.style.opacity = '1';
        }
        
        this.updateLayout();
    }

    makeStandaloneDraggable(component) {
        const element = component.standaloneElement;
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };
        
        element.addEventListener('mousedown', (e) => {
            isDragging = true;
            const rect = element.getBoundingClientRect();
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;
            
            element.style.cursor = 'grabbing';
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const newX = e.clientX - dragOffset.x;
            const newY = e.clientY - dragOffset.y;
            
            element.style.left = newX + 'px';
            element.style.top = newY + 'px';
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                element.style.cursor = 'grab';
            }
        });
    }

    // Theme management
    updateTheme(themeName) {
        console.log('StudyPouchManager updateTheme called with:', themeName);
        this.currentTheme = themeName;
        this.applyTheme();
        
        // Update all components
        this.components.forEach(component => {
            component.applyTheme(themeName);
        });
    }

    applyTheme() {
        console.log('StudyPouchManager applyTheme called');
        
        if (!this.container) {
            console.warn('Study Pouch container not available');
            return;
        }
        
        // Use glass theme like everything else in the extension
        if (window.glassThemes && window.glassThemes[this.currentTheme]) {
            console.log('Applying glass theme to Study Pouch:', this.currentTheme);
            const glassTheme = window.glassThemes[this.currentTheme];
            this.applyGlassTheme(glassTheme);
            
            // Apply theme to all components
            this.components.forEach(component => {
                if (component && typeof component.applyTheme === 'function') {
                    component.applyTheme(this.currentTheme);
                }
            });
        } else {
            console.warn('Glass themes not available or theme not found:', this.currentTheme);
        }
    }
    
    applyGlassTheme(glassTheme) {
        console.log('Applying glass theme to Study Pouch:', glassTheme);
        
        // Create a more opaque background for the main container
        const opaqueBackground = glassTheme.panelBg
            .replace(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/g, (match, r, g, b, a) => {
                // Increase opacity significantly for better visibility
                const newAlpha = Math.min(parseFloat(a) * 2.5, 0.9);
                return `rgba(${r}, ${g}, ${b}, ${newAlpha})`;
            });
        
        // Apply the same styling as the main Kana panels but with more opacity
        this.container.style.background = opaqueBackground;
        this.container.style.borderColor = glassTheme.panelBorder;
        this.container.style.color = glassTheme.textColor;
        this.container.style.boxShadow = glassTheme.panelShadow;
        this.container.style.backdropFilter = 'blur(20px)';
        this.container.style.border = `1px solid ${glassTheme.panelBorder}`;
        this.container.style.borderRadius = '16px';
        
        // Set CSS variables for components to use
        this.container.style.setProperty('--theme-bg', opaqueBackground);
        this.container.style.setProperty('--theme-primary', glassTheme.orbBg);
        this.container.style.setProperty('--theme-secondary', glassTheme.panelShadow);
        this.container.style.setProperty('--theme-accent', glassTheme.panelBorder);
        this.container.style.setProperty('--theme-text', glassTheme.textColor);
    }

    // Get component by ID
    getComponent(componentId) {
        return this.components.get(componentId);
    }

    // Open a component directly as a standalone floating window
    openComponentAsStandalone(type) {
        console.log(`📦 StudyPouchManager.openComponentAsStandalone called with type: ${type}`);
        console.log(`📦 Available component types:`, Object.keys(this.componentTypes));
        
        const ComponentClass = this.componentTypes[type];
        console.log(`📦 ComponentClass for ${type}:`, ComponentClass);
        
        if (!ComponentClass) {
            console.warn('❌ Unknown component type:', type);
            return null;
        }

        const componentId = `${type}-standalone-${Date.now()}`;
        console.log(`📦 Creating component with ID: ${componentId}`);
        
        const component = new ComponentClass(componentId, this, type);
        console.log(`📦 Component created:`, component);
        
        // Create standalone element directly
        console.log(`📦 Creating standalone version...`);
        const standaloneComponent = component.createStandaloneVersion();
        console.log(`📦 Standalone component created:`, standaloneComponent);
        
        // Position the standalone component in the center of the screen
        const x = window.innerWidth / 2;
        const y = window.innerHeight / 2;
        
        standaloneComponent.style.position = 'fixed';
        standaloneComponent.style.left = Math.max(20, Math.min(x - 150, window.innerWidth - 320)) + 'px';
        standaloneComponent.style.top = Math.max(20, Math.min(y - 100, window.innerHeight - 400)) + 'px';
        standaloneComponent.style.zIndex = '2147483646';
        
        console.log(`📦 Appending to document.body...`);
        document.body.appendChild(standaloneComponent);
        console.log(`📦 Component appended to DOM`);
        
        // Set component properties
        component.isStandalone = true;
        component.standaloneElement = standaloneComponent;
        
        // Make standalone draggable
        console.log(`📦 Making draggable...`);
        this.makeStandaloneDraggable(component);
        
        // Apply theme to standalone
        console.log(`📦 Applying theme: ${this.currentTheme}`);
        component.applyTheme(this.currentTheme);
        
        // Auto-open the component in expanded state
        if (typeof component.openStandalone === 'function') {
            console.log(`📦 Calling openStandalone...`);
            component.openStandalone();
        } else {
            console.log(`📦 No openStandalone method found`);
        }
        
        // Store the component
        this.components.set(componentId, component);
        console.log(`📦 Component stored in components map`);
        
        console.log(`📦 ✅ Successfully created standalone ${type} component`);
        return component;
        
        console.log(`${type} component opened as standalone with ID: ${componentId}`);
        return component;
    }

    // Get all components of a specific type
    getComponentsByType(type) {
        return Array.from(this.components.values()).filter(component => 
            component.type === type
        );
    }
}

// Export for use in content script
window.StudyPouchManager = StudyPouchManager;
