// Variables globales
let cart = [];
let cartTotal = 0;
let productos = []; // Array para almacenar productos de la API

// API Configuration
const SHEETSDB_API_URL = 'https://sheetdb.io/api/v1/x65mah6ylx8pz';

// DOM Elements
const cartIcon = document.getElementById('cart-icon');
const cartModal = document.getElementById('cart-modal');
const closeCart = document.getElementById('close-cart');
const cartCount = document.getElementById('cart-count');
const cartItems = document.getElementById('cart-items');
const cartTotalElement = document.getElementById('cart-total');
const hamburger = document.getElementById('hamburger');
const navMenu = document.querySelector('.nav-menu');

// Función para cargar productos desde la API
async function loadProductsFromAPI() {
    try {
        console.log('Cargando productos desde SheetsDB...');
        const response = await fetch(SHEETSDB_API_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Datos recibidos:', data);
        
        // Procesar los datos y crear el array de productos
        productos = data.map((item, index) => ({
            id: index + 1,
            nombre: item['Nombre producto'] || item.nombre || '',
            descripcion: item['Descripción producto'] || item.descripcion || '',
            precio: parseFloat(item['Precio producto'] || item.precio || 0),
            imagen: item['img_product'] || item.imagen || '',
            categoria: determineCategory(item['Nombre producto'] || item.nombre || ''),
            tipo: item['Tipo'] || item.tipo || 'Moderno' // Nueva columna Tipo con valor por defecto
        }));
        
        console.log('Productos procesados:', productos);
        
        // Renderizar los productos en el DOM
        renderProducts();
        
        return productos;
    } catch (error) {
        console.error('Error al cargar productos:', error);
        // Mostrar mensaje de error al usuario
        showErrorMessage('Error al cargar los productos. Intenta recargar la página.');
        return [];
    }
}

// Función para determinar la categoría basada en el nombre del producto
function determineCategory(nombre) {
    const nombreLower = nombre.toLowerCase();
    
    if (nombreLower.includes('premium') || nombreLower.includes('deluxe') || nombreLower.includes('lujo')) {
        return 'premium';
    } else if (nombreLower.includes('moderno') || nombreLower.includes('contemporáneo') || nombreLower.includes('cubo') || nombreLower.includes('cilíndrico')) {
        return 'modernos';
    } else {
        return 'clasicos';
    }
}

// Función para renderizar productos en el DOM
// Función para convertir enlaces de Google Drive al formato correcto
function convertGoogleDriveUrl(url) {
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
}

function renderProducts() {
    const productosGrid = document.querySelector('.productos-grid');
    
    if (!productosGrid) {
        console.error('No se encontró el contenedor de productos');
        return;
    }
    
    // Limpiar productos existentes
    productosGrid.innerHTML = '';
    
    // Crear HTML para cada producto
    productos.forEach(producto => {
        // Convertir la URL de la imagen si es necesario
        const imagenUrl = convertGoogleDriveUrl(producto.imagen);
        
        const productoCard = document.createElement('div');
        productoCard.className = 'producto-card';
        productoCard.setAttribute('data-category', producto.tipo.toLowerCase());
        
        productoCard.innerHTML = `
            <div class="producto-image" style="position: relative;">
                ${imagenUrl ? 
                    `<img src="${imagenUrl}" alt="${producto.nombre}" 
                          style="width: 100%; height: 200px; object-fit: cover; border-radius: 10px; position: relative; z-index: 2;" 
                          onerror="console.log('Error cargando imagen:', this.src); this.style.display='none'; this.nextElementSibling.style.display='flex';"
                          onload="console.log('Imagen cargada exitosamente:', this.src); this.nextElementSibling.style.display='none';">
                     <div class="emoji-icon" style="display: flex; width: 100%; height: 200px; align-items: center; justify-content: center; font-size: 4rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; color: white; position: absolute; top: 0; left: 0; z-index: 1;">${getEmojiForCategory(producto.categoria)}</div>` :
                    `<div class="emoji-icon" style="width: 100%; height: 200px; display: flex; align-items: center; justify-content: center; font-size: 4rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; color: white;">${getEmojiForCategory(producto.categoria)}</div>`
                }
            </div>
            <div class="producto-overlay">
                <button class="quick-view-btn" data-product-id="${producto.id}" onclick="openQuickView(${producto.id})">Vista Rápida</button>
            </div>
            <div class="producto-info">
                <div class="producto-tipo-badge tipo-${producto.tipo.toLowerCase()}">${producto.tipo}</div>
                <h3>${producto.nombre}</h3>
                <p>${producto.descripcion}</p>
                <div class="precio">$${producto.precio.toFixed(2)}</div>
                <button class="add-to-cart-btn" data-id="${producto.id}" data-name="${producto.nombre}" data-price="${producto.precio}">
                    <i class="fas fa-cart-plus"></i> Agregar al Carrito
                </button>
            </div>
        `;
        
        productosGrid.appendChild(productoCard);
    });
    
    // Reinicializar event listeners para los nuevos botones
    initializeProductEventListeners();
}

// Función para obtener emoji según categoría
function getEmojiForCategory(categoria) {
    switch(categoria) {
        case 'premium': return '👑';
        case 'modernos': return '🪑';
        case 'clasicos': return '🛋️';
        default: return '🪑';
    }
}

// Función para mostrar mensajes de error
function showErrorMessage(message) {
    const productosGrid = document.querySelector('.productos-grid');
    if (productosGrid) {
        productosGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; background: #ffebee; border-radius: 10px; color: #c62828;">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <p style="font-size: 1.1rem; margin: 0;">${message}</p>
            </div>
        `;
    }
}

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    initializeAnimations();
    updateCartDisplay();
    
    // Cargar productos desde la API
    loadProductsFromAPI();
    
    // Inicializar formulario de contacto
    initializeContactForm();
});

// Event Listeners
function initializeEventListeners() {
    // Cart functionality
    cartIcon.addEventListener('click', openCart);
    closeCart.addEventListener('click', closeCartModal);
    
    // Close cart when clicking outside
    cartModal.addEventListener('click', function(e) {
        if (e.target === cartModal) {
            closeCartModal();
        }
    });

    // Mobile menu toggle
    hamburger.addEventListener('click', toggleMobileMenu);

    // Filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            filterProducts(filter);
            
            // Update active button
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Inicializar event listeners de productos
    initializeProductEventListeners();
}

// Función separada para inicializar event listeners de productos
function initializeProductEventListeners() {
    // Add to cart buttons
    const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
    addToCartButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            const name = this.getAttribute('data-name');
            const price = parseFloat(this.getAttribute('data-price'));
            
            addToCart(id, name, price);
            
            // Visual feedback
            this.innerHTML = '<i class="fas fa-check"></i> ¡Agregado!';
            this.style.background = 'var(--mint-color)';
            
            setTimeout(() => {
                this.innerHTML = '<i class="fas fa-cart-plus"></i> Agregar al Carrito';
                this.style.background = '';
            }, 1500);
        });
    });
}

// Contact form initialization
function initializeContactForm() {
    const contactForm = document.querySelector('.contacto-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Simple form validation and feedback
            const inputs = this.querySelectorAll('input, textarea');
            let isValid = true;
            
            inputs.forEach(input => {
                if (!input.value.trim()) {
                    isValid = false;
                    input.style.borderColor = '#ff6b6b';
                } else {
                    input.style.borderColor = 'var(--secondary-color)';
                }
            });
            
            if (isValid) {
                alert('¡Gracias por tu mensaje! Te contactaremos pronto.');
                this.reset();
            } else {
                alert('Por favor, completa todos los campos.');
            }
        });
    }

    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                
                // Close mobile menu if open
                navMenu.classList.remove('active');
            }
        });
    });
}


// Cart Functions
function addToCart(id, name, price) {
    const existingItem = cart.find(item => item.id === id);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: id,
            name: name,
            price: price,
            quantity: 1
        });
    }
    
    updateCartDisplay();
    saveCartToStorage();
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    updateCartDisplay();
    saveCartToStorage();
}

function updateQuantity(id, newQuantity) {
    if (newQuantity <= 0) {
        removeFromCart(id);
        return;
    }
    
    const item = cart.find(item => item.id === id);
    if (item) {
        item.quantity = newQuantity;
        updateCartDisplay();
        saveCartToStorage();
    }
}

function updateCartDisplay() {
    // Update cart count
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    
    // Update cart total
    cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotalElement.textContent = cartTotal.toFixed(2);
    
    // Update cart items display
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Tu carrito está vacío</p>
                <p>¡Agrega algunos puffs hermosos!</p>
            </div>
        `;
    } else {
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <div class="cart-item-price">$${item.price.toFixed(2)}</div>
                </div>
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="updateQuantity('${item.id}', ${item.quantity - 1})">-</button>
                    <span class="quantity">${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
                </div>
                <button class="remove-item" onclick="removeFromCart('${item.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    }
}

function openCart() {
    cartModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCartModal() {
    cartModal.classList.remove('active');
    document.body.style.overflow = '';
}

// Storage Functions
function saveCartToStorage() {
    localStorage.setItem('puffs-cart', JSON.stringify(cart));
}

function loadCartFromStorage() {
    const savedCart = localStorage.getItem('puffs-cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartDisplay();
    }
}

// Filter Products
function filterProducts(category) {
    const products = document.querySelectorAll('.producto-card');
    
    products.forEach(product => {
        const productCategory = product.getAttribute('data-category');
        if (category === 'all' || productCategory === category) {
            product.style.display = 'block';
            product.style.animation = 'fadeInUp 0.5s ease forwards';
        } else {
            product.style.display = 'none';
        }
    });
}

// Mobile Menu Toggle
function toggleMobileMenu() {
    navMenu.classList.toggle('active');
    hamburger.classList.toggle('active');
}

// Scroll to Section
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Animations
function initializeAnimations() {
    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animatedElements = document.querySelectorAll('.producto-card, .feature, .contacto-item');
    animatedElements.forEach(el => {
        el.classList.add('fade-in');
        observer.observe(el);
    });
    
    // Parallax effect for hero section
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const parallax = document.querySelector('.hero');
        const speed = scrolled * 0.5;
        
        if (parallax) {
            parallax.style.transform = `translateY(${speed}px)`;
        }
        
        // Header background on scroll
        const header = document.querySelector('.header');
        if (scrolled > 100) {
            header.style.background = 'rgba(255, 182, 193, 0.95)';
            header.style.backdropFilter = 'blur(10px)';
        } else {
            header.style.background = 'var(--gradient-primary)';
            header.style.backdropFilter = 'blur(10px)';
        }
    });
}

// Checkout function (placeholder)
function checkout() {
    if (cart.length === 0) {
        alert('Tu carrito está vacío');
        return;
    }
    
    alert(`¡Gracias por tu compra!\nTotal: $${cartTotal.toFixed(2)}\n\nEn una implementación real, aquí se procesaría el pago.`);
    
    // Clear cart
    cart = [];
    updateCartDisplay();
    saveCartToStorage();
    closeCartModal();
}

// Add checkout event listener
document.addEventListener('DOMContentLoaded', function() {
    const checkoutBtn = document.querySelector('.checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', checkout);
    }
});

// Load cart from storage on page load
window.addEventListener('load', function() {
    loadCartFromStorage();
});

// CSS Animation keyframes (added via JavaScript)
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .hamburger.active span:nth-child(1) {
        transform: rotate(45deg) translate(5px, 5px);
    }
    
    .hamburger.active span:nth-child(2) {
        opacity: 0;
    }
    
    .hamburger.active span:nth-child(3) {
        transform: rotate(-45deg) translate(7px, -6px);
    }
`;
document.head.appendChild(style);

// Quick View Modal Functions
let currentProduct = null;

function openQuickView(productId) {
    const product = productos.find(p => p.id === parseInt(productId));
    if (!product) return;
    
    currentProduct = product;
    
    // Actualizar contenido del modal
    document.getElementById('modal-product-name').textContent = product.nombre;
    document.getElementById('modal-product-type').textContent = product.tipo;
    document.getElementById('modal-product-type').className = `tipo-badge tipo-${product.tipo.toLowerCase()}`;
    document.getElementById('modal-product-description').textContent = product.descripcion;
    document.getElementById('modal-product-price').textContent = `$${product.precio.toFixed(2)}`;
    
    // Manejar imagen del producto
    const modalImageContainer = document.getElementById('modal-product-image');
    const modalEmoji = document.getElementById('modal-emoji');
    
    // Limpiar contenido anterior
    modalImageContainer.innerHTML = '';
    
    if (product.imagen) {
        const imagenUrl = convertGoogleDriveUrl(product.imagen);
        if (imagenUrl) {
            const img = document.createElement('img');
            img.src = imagenUrl;
            img.alt = product.nombre;
            img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; position: relative; z-index: 2;';
            
            // Crear emoji de fallback
            const emojiDiv = document.createElement('div');
            emojiDiv.className = 'emoji-icon';
            emojiDiv.textContent = getEmojiForCategory(product.categoria);
            emojiDiv.style.cssText = 'width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 6rem; background: var(--gradient-purple); color: white; position: absolute; top: 0; left: 0; z-index: 1;';
            
            img.onload = function() {
                console.log('Imagen del modal cargada exitosamente:', this.src);
                emojiDiv.style.display = 'none';
            };
            
            img.onerror = function() {
                console.log('Error cargando imagen del modal:', this.src);
                this.style.display = 'none';
                emojiDiv.style.display = 'flex';
            };
            
            modalImageContainer.appendChild(img);
            modalImageContainer.appendChild(emojiDiv);
        } else {
            // Solo mostrar emoji
            const emojiDiv = document.createElement('div');
            emojiDiv.className = 'emoji-icon';
            emojiDiv.textContent = getEmojiForCategory(product.categoria);
            modalImageContainer.appendChild(emojiDiv);
        }
    } else {
        // Solo mostrar emoji
        const emojiDiv = document.createElement('div');
        emojiDiv.className = 'emoji-icon';
        emojiDiv.textContent = getEmojiForCategory(product.categoria);
        modalImageContainer.appendChild(emojiDiv);
    }
    
    // Configurar botón de agregar al carrito del modal
    const modalAddToCartBtn = document.getElementById('modal-add-to-cart');
    if (modalAddToCartBtn) {
        // Remover event listeners anteriores
        modalAddToCartBtn.onclick = null;
        
        // Agregar nuevo event listener
        modalAddToCartBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Agregando al carrito desde modal:', product.nombre);
            addToCart(product.id, product.nombre, product.precio);
            closeQuickView();
        };
    }
    
    // Mostrar modal
    const modal = document.getElementById('quick-view-modal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevenir scroll del body
}

function closeQuickView() {
    const modal = document.getElementById('quick-view-modal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto'; // Restaurar scroll del body
    currentProduct = null;
}

// Event listeners para el modal
document.addEventListener('DOMContentLoaded', function() {
    // Botón cerrar modal
    document.getElementById('close-quick-view').addEventListener('click', closeQuickView);
    
    // Botón continuar comprando
    document.getElementById('continue-shopping').addEventListener('click', closeQuickView);
    
    // Cerrar modal al hacer click fuera del contenido
    document.getElementById('quick-view-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeQuickView();
        }
    });
    
    // Cerrar modal con tecla Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && document.getElementById('quick-view-modal').classList.contains('active')) {
            closeQuickView();
        }
    });
});