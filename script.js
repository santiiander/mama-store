// Pao Deco's - E-commerce JavaScript
// Estado global de la aplicación
const AppState = {
    cart: [],
    products: [],
    currentCategory: 'all',
    currentPage: 'home',
    isLoading: false,
    error: null
};

// Configuración de la API
const API_CONFIG = {
    SHEETSDB_API_URL: "https://sheetdb.io/api/v1/2su9b1nwyjo5q"
};

// Utilidades
const Utils = {
    // Formatear precio
    formatPrice: (price) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
        }).format(price);
    },

    // Generar ID único
    generateId: () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // Debounce para optimizar rendimiento
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Convertir URLs de Google Drive al formato correcto
    convertGoogleDriveUrl: (url) => {
        if (!url) return url;
        
        // Si es solo un ID de Google Drive (sin https://)
        if (url.length > 20 && url.length < 50 && !url.includes('http') && !url.includes('.')) {
            // Intentar múltiples formatos de Google Drive
            return `https://drive.google.com/thumbnail?id=${url}&sz=w400-h400`;
        }
        
        // Si es un enlace de Google Drive, convertirlo al formato de visualización directa
        if (url.includes('drive.google.com')) {
            // Extraer el ID del archivo de diferentes formatos de URL de Google Drive
            let fileId = null;
            
            // Formato: https://drive.google.com/uc?export=view&id=FILE_ID
            if (url.includes('id=')) {
                fileId = url.split('id=')[1].split('&')[0];
            }
            // Formato: https://drive.google.com/file/d/FILE_ID/view
            else if (url.includes('/file/d/')) {
                fileId = url.split('/file/d/')[1].split('/')[0];
            }
            
            // Si encontramos el ID, usar el formato de thumbnail
            if (fileId) {
                return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400-h400`;
            }
        }
        
        // Si no es de Google Drive, devolver la URL original
        return url;
    },

    // Mostrar toast notification
    showToast: (title, description, type = 'success') => {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">${type === 'success' ? '✅' : '❌'}</div>
                <div>
                    <div class="toast-title">${title}</div>
                    <div class="toast-description">${description}</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Mostrar toast
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Ocultar y remover toast
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }
};

// Gestión del carrito de compras
const CartManager = {
    // Cargar carrito desde localStorage
    loadCart: () => {
        try {
            const savedCart = localStorage.getItem('pao-decos-cart');
            AppState.cart = savedCart ? JSON.parse(savedCart) : [];
        } catch (error) {
            console.error('Error loading cart:', error);
            AppState.cart = [];
        }
    },

    // Guardar carrito en localStorage
    saveCart: () => {
        try {
            localStorage.setItem('pao-decos-cart', JSON.stringify(AppState.cart));
        } catch (error) {
            console.error('Error saving cart:', error);
        }
    },

    // Agregar producto al carrito
    addToCart: (product) => {
        // Verificar si hay stock disponible
        if (product.stock <= 0) {
            Utils.showToast('Sin stock', 'Este producto no está disponible', 'error');
            return;
        }

        const existingItem = AppState.cart.find(item => item.id === product.id);
        
        if (existingItem) {
            // Verificar si agregar uno más excede el stock
            if (existingItem.quantity >= product.stock) {
                Utils.showToast('Stock insuficiente', `Solo quedan ${product.stock} unidades disponibles`, 'error');
                return;
            }
            existingItem.quantity += 1;
        } else {
            AppState.cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                category: product.category,
                image: product.image,
                quantity: 1
            });
        }
        
        CartManager.saveCart();
        CartManager.updateCartUI();
        Utils.showToast('¡Producto agregado!', `${product.name} se agregó al carrito`);
    },

    // Remover producto del carrito
    removeFromCart: (productId) => {
        const itemIndex = AppState.cart.findIndex(item => item.id === productId);
        if (itemIndex > -1) {
            const item = AppState.cart[itemIndex];
            AppState.cart.splice(itemIndex, 1);
            CartManager.saveCart();
            CartManager.updateCartUI();
            Utils.showToast('Producto eliminado', `${item.name} se eliminó del carrito`);
        }
    },

    // Actualizar cantidad de producto
    updateQuantity: (productId, newQuantity) => {
        const item = AppState.cart.find(item => item.id === productId);
        if (item) {
            if (newQuantity <= 0) {
                CartManager.removeFromCart(productId);
            } else {
                item.quantity = newQuantity;
                CartManager.saveCart();
                CartManager.updateCartUI();
            }
        }
    },

    // Limpiar carrito
    clearCart: () => {
        AppState.cart = [];
        CartManager.saveCart();
        CartManager.updateCartUI();
        Utils.showToast('Carrito vaciado', 'Se eliminaron todos los productos del carrito');
    },

    // Calcular total del carrito
    getCartTotal: () => {
        return AppState.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    },

    // Obtener cantidad total de items
    getCartItemCount: () => {
        return AppState.cart.reduce((total, item) => total + item.quantity, 0);
    },

    // Actualizar UI del carrito
    updateCartUI: () => {
        // Actualizar contador en navbar
        const cartCount = document.querySelector('.cart-count');
        const itemCount = CartManager.getCartItemCount();
        
        if (cartCount) {
            cartCount.textContent = itemCount;
            cartCount.style.display = itemCount > 0 ? 'flex' : 'none';
        }

        // Si estamos en la página del carrito, actualizar contenido
        if (AppState.currentPage === 'cart') {
            CartManager.renderCartPage();
        }
    },

    // Renderizar página del carrito
    renderCartPage: () => {
        const cartContainer = document.querySelector('.cart-container');
        if (!cartContainer) return;

        if (AppState.cart.length === 0) {
            cartContainer.innerHTML = `
                <div class="cart-header">
                    <h1 class="cart-title">Tu Carrito</h1>
                    <p class="cart-subtitle">Gestiona los productos que deseas comprar</p>
                </div>
                <div class="empty-cart">
                    <div class="empty-cart-icon">🛒</div>
                    <h3>Tu carrito está vacío</h3>
                    <p>¡Explora nuestros productos y encuentra algo que te guste!</p>
                    <button class="btn btn-primary" onclick="PageManager.showPage('home')">
                        Ver Productos
                    </button>
                </div>
            `;
            return;
        }

        const cartItemsHTML = AppState.cart.map(item => `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.name}" class="cart-item-image" />
                <div class="cart-item-content">
                    <div class="cart-item-header">
                        <div>
                            <h3 class="cart-item-name">${item.name}</h3>
                            <p class="cart-item-category">${item.category}</p>
                        </div>
                        <div class="cart-item-price">${Utils.formatPrice(item.price)}</div>
                    </div>
                    <div class="cart-item-controls">
                        <div class="quantity-controls">
                            <button class="quantity-btn" onclick="CartManager.updateQuantity('${item.id}', ${item.quantity - 1})" ${item.quantity <= 1 ? 'disabled' : ''}>
                                -
                            </button>
                            <span class="quantity-display">${item.quantity}</span>
                            <button class="quantity-btn" onclick="CartManager.updateQuantity('${item.id}', ${item.quantity + 1})">
                                +
                            </button>
                        </div>
                        <button class="remove-btn" onclick="CartManager.removeFromCart('${item.id}')" title="Eliminar producto">
                            🗑️
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        const total = CartManager.getCartTotal();
        const itemCount = CartManager.getCartItemCount();

        cartContainer.innerHTML = `
            <div class="cart-header">
                <h1 class="cart-title">Tu Carrito</h1>
                <p class="cart-subtitle">Gestiona los productos que deseas comprar</p>
            </div>
            <div class="cart-items">
                ${cartItemsHTML}
            </div>
            <div class="cart-summary">
                <div class="summary-row">
                    <span class="summary-label">Total (${itemCount} ${itemCount === 1 ? 'producto' : 'productos'})</span>
                    <span class="summary-value">${Utils.formatPrice(total)}</span>
                </div>
                <div class="cart-actions">
                    <button class="btn btn-outline" onclick="CartManager.clearCart()">
                        Vaciar Carrito
                    </button>
                    <button class="btn btn-primary" onclick="CartManager.checkout()">
                        Finalizar Compra
                    </button>
                </div>
            </div>
        `;
    },

    // Proceso de checkout
    checkout: () => {
        if (AppState.cart.length === 0) {
            Utils.showToast('Carrito vacío', 'Agrega productos antes de finalizar la compra', 'error');
            return;
        }

        const total = CartManager.getCartTotal();
        const itemCount = CartManager.getCartItemCount();
        
        // Crear mensaje para WhatsApp
        const cartItems = AppState.cart.map(item => 
            `• ${item.name} (x${item.quantity}) - ${Utils.formatPrice(item.price * item.quantity)}`
        ).join('\n');
        
        const message = `¡Hola! Me interesa realizar una compra:\n\n${cartItems}\n\n*Total: ${Utils.formatPrice(total)}*\n\n¡Gracias!`;
        
        // Número de WhatsApp
        const phoneNumber = '5493472580548'; // +54 9 3472 58-0548
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        
        // Abrir WhatsApp
        window.open(whatsappUrl, '_blank');
        
        Utils.showToast('¡Redirigiendo a WhatsApp!', 'Completa tu compra por WhatsApp');
    }
};

// Gestión de productos
const ProductManager = {
    // Cargar productos desde la API
    loadProducts: async () => {
        AppState.isLoading = true;
        AppState.error = null;
        ProductManager.updateProductsUI();

        try {
            console.log('Cargando productos desde:', API_CONFIG.SHEETSDB_API_URL);
            const response = await fetch(API_CONFIG.SHEETSDB_API_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Datos recibidos de la API:', data);
            
            // Procesar y validar datos con las columnas correctas de SheetDB
            AppState.products = data.map(item => ({
                id: Utils.generateId(),
                name: item['Nombre producto'] || 'Producto sin nombre',
                price: parseFloat(item['Precio producto']) || 0,
                category: item['Tipo'] || 'general',
                description: item['Descripción producto'] || 'Sin descripción disponible',
                characteristics: item['Caracteristicas'] || '',
                image: Utils.convertGoogleDriveUrl(item['img_product']) || 'https://via.placeholder.com/300x200?text=Sin+Imagen',
                stock: parseInt(item['Stock']) || 0
            }));
            
            console.log('Productos procesados:', AppState.products);
            AppState.isLoading = false;
            ProductManager.updateProductsUI();
            
        } catch (error) {
            console.error('Error loading products:', error);
            AppState.error = 'Error al cargar los productos. Por favor, intenta nuevamente.';
            AppState.isLoading = false;
            ProductManager.updateProductsUI();
        }
    },

    // Obtener categorías únicas
    getCategories: () => {
        const categories = [...new Set(AppState.products.map(product => product.category))];
        return ['all', ...categories];
    },

    // Filtrar productos por categoría
    getFilteredProducts: () => {
        if (AppState.currentCategory === 'all') {
            return AppState.products;
        }
        return AppState.products.filter(product => product.category === AppState.currentCategory);
    },

    // Actualizar UI de productos
    updateProductsUI: () => {
        ProductManager.renderCategoryFilter();
        ProductManager.renderProducts();
    },

    // Renderizar filtro de categorías
    renderCategoryFilter: () => {
        const filterContainer = document.querySelector('.category-filter');
        if (!filterContainer) return;

        const categories = ProductManager.getCategories();
        const categoryNames = {
            'all': 'Todos',
            'living': 'Living',
            'dormitorio': 'Dormitorio',
            'cocina': 'Cocina',
            'decoracion': 'Decoración',
            'iluminacion': 'Iluminación'
        };

        filterContainer.innerHTML = categories.map(category => `
            <button 
                class="filter-btn ${AppState.currentCategory === category ? 'active' : ''}"
                onclick="ProductManager.setCategory('${category}')"
            >
                ${categoryNames[category] || category}
            </button>
        `).join('');
    },

    // Establecer categoría activa
    setCategory: (category) => {
        AppState.currentCategory = category;
        ProductManager.updateProductsUI();
    },

    // Renderizar productos
    renderProducts: () => {
        const productsContainer = document.querySelector('#productsGrid');
        const loadingState = document.querySelector('#productsLoading');
        const errorState = document.querySelector('#productsError');
        
        if (!productsContainer) return;

        // Ocultar todos los estados
        if (loadingState) loadingState.classList.add('hidden');
        if (errorState) errorState.classList.add('hidden');
        productsContainer.classList.add('hidden');

        if (AppState.isLoading) {
            if (loadingState) {
                loadingState.classList.remove('hidden');
            }
            return;
        }

        if (AppState.error) {
            if (errorState) {
                errorState.classList.remove('hidden');
            }
            return;
        }

        const filteredProducts = ProductManager.getFilteredProducts();

        if (filteredProducts.length === 0) {
            productsContainer.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">🔍</div>
                    <h3>No se encontraron productos</h3>
                    <p>No hay productos disponibles en esta categoría.</p>
                </div>
            `;
            productsContainer.classList.remove('hidden');
            return;
        }

        productsContainer.innerHTML = filteredProducts.map(product => {
            // Determinar el color y texto del stock
            let stockClass = '';
            let stockText = '';
            let stockIcon = '';
            
            if (product.stock <= 0) {
                stockClass = 'stock-out';
                stockText = 'Sin stock';
                stockIcon = '❌';
            } else if (product.stock <= 3) {
                stockClass = 'stock-low';
                stockText = `Quedan ${product.stock}`;
                stockIcon = '⚠️';
            } else if (product.stock <= 8) {
                stockClass = 'stock-medium';
                stockText = `Stock: ${product.stock}`;
                stockIcon = '⚡';
            } else {
                stockClass = 'stock-high';
                stockText = `Stock: ${product.stock}`;
                stockIcon = '✅';
            }
            
            return `
                <div class="product-card">
                    <img src="${product.image}" alt="${product.name}" class="product-image" />
                    <div class="product-content">
                        <div class="product-category">${product.category}</div>
                        <h3 class="product-name">${product.name}</h3>
                        <p class="product-description">${product.description}</p>
                        <div class="product-stock">
                            <span class="stock-indicator ${stockClass}">
                                ${stockIcon} ${stockText}
                            </span>
                        </div>
                        <div class="product-footer">
                            <span class="product-price">${Utils.formatPrice(product.price)}</span>
                            <button 
                                class="add-to-cart-btn ${product.stock <= 0 ? 'disabled' : ''}" 
                                onclick="CartManager.addToCart(${JSON.stringify(product).replace(/"/g, '&quot;')})"
                                ${product.stock <= 0 ? 'disabled' : ''}
                            >
                                ${product.stock <= 0 ? 'Sin stock' : 'Agregar'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        productsContainer.classList.remove('hidden');
    }
};

// Gestión de páginas
const PageManager = {
    // Mostrar página específica
    showPage: (pageName) => {
        console.log('Showing page:', pageName); // Debug log
        
        // Ocultar todas las páginas
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Mostrar página solicitada
        let targetPage;
        if (pageName === 'home') {
            targetPage = document.getElementById('homePage');
        } else if (pageName === 'cart') {
            targetPage = document.getElementById('cartPage');
        }
        
        if (targetPage) {
            targetPage.classList.add('active');
            AppState.currentPage = pageName;

            // Actualizar navegación activa
            PageManager.updateActiveNavigation(pageName);

            // Cargar contenido específico de la página
            if (pageName === 'cart') {
                CartManager.renderCartPage();
            } else if (pageName === 'home' && AppState.products.length === 0) {
                ProductManager.loadProducts();
            }
        } else {
            console.error('Page not found:', pageName);
        }
    },

    // Actualizar navegación activa
    updateActiveNavigation: (activePage) => {
        document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
            link.classList.remove('active');
        });

        document.querySelectorAll(`[data-page="${activePage}"]`).forEach(link => {
            link.classList.add('active');
        });
    },

    // Scroll suave a sección
    scrollToSection: (sectionId) => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
    }
};

// Gestión de navegación móvil
const MobileNavManager = {
    // Toggle del menú móvil
    toggle: () => {
        const mobileNav = document.querySelector('.mobile-nav');
        const menuIcon = document.querySelector('.menu-icon');
        const closeIcon = document.querySelector('.close-icon');
        
        if (mobileNav.classList.contains('hidden')) {
            mobileNav.classList.remove('hidden');
            menuIcon.style.display = 'none';
            closeIcon.style.display = 'block';
        } else {
            mobileNav.classList.add('hidden');
            menuIcon.style.display = 'block';
            closeIcon.style.display = 'none';
        }
    },

    // Cerrar menú móvil
    close: () => {
        const mobileNav = document.querySelector('.mobile-nav');
        const menuIcon = document.querySelector('.menu-icon');
        const closeIcon = document.querySelector('.close-icon');
        
        mobileNav.classList.add('hidden');
        menuIcon.style.display = 'block';
        closeIcon.style.display = 'none';
    }
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...'); // Debug log
    
    // Inicializar aplicación
    CartManager.loadCart();
    CartManager.updateCartUI();
    
    // Cargar productos
    ProductManager.loadProducts();
    
    // Mostrar página inicial
    PageManager.showPage('home');
    
    // Configurar navegación
    document.querySelectorAll('[data-page]').forEach(link => {
        console.log('Setting up navigation for:', link); // Debug log
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            console.log('Navigation clicked:', page); // Debug log
            PageManager.showPage(page);
            MobileNavManager.close();
        });
    });

    // Configurar botón del carrito
    const cartButton = document.querySelector('.cart-button');
    console.log('Cart button found:', cartButton); // Debug log
    if (cartButton) {
        cartButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Cart button clicked'); // Debug log
            PageManager.showPage('cart');
        });
    }

    // Configurar menú móvil
    const mobileMenuButton = document.querySelector('.mobile-menu-button');
    if (mobileMenuButton) {
        mobileMenuButton.addEventListener('click', MobileNavManager.toggle);
    }

    // Configurar scroll suave para enlaces internos
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            PageManager.scrollToSection(targetId);
        });
    });

    // Cerrar menú móvil al hacer clic fuera
    document.addEventListener('click', (e) => {
        const mobileNav = document.querySelector('.mobile-nav');
        const mobileMenuButton = document.querySelector('.mobile-menu-button');
        
        if (!mobileNav.contains(e.target) && !mobileMenuButton.contains(e.target)) {
            MobileNavManager.close();
        }
    });

    // Manejar cambio de tamaño de ventana
    window.addEventListener('resize', Utils.debounce(() => {
        if (window.innerWidth >= 768) {
            MobileNavManager.close();
        }
    }, 250));
});

// Exponer funciones globales necesarias
window.CartManager = CartManager;
window.ProductManager = ProductManager;
window.PageManager = PageManager;
window.MobileNavManager = MobileNavManager;