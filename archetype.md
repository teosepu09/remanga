# Archetype: Manga Store Application

## Project Overview
A Flask-based web application for buying and selling manga. Users can browse a product catalog, manage shopping carts, and sellers can list products for sale. The application uses SQLite for data persistence and includes image upload capabilities.

## Technology Stack
- **Backend**: Flask (Python)
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Database**: SQLite
- **CORS**: Flask-CORS for cross-origin requests
- **File Handling**: Werkzeug for secure file uploads

## Project Structure

```
mangas/repo/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── archetype.md          # This file
├── db_mangas1.0.db       # SQLite database (not shown)
├── imagenes/             # Uploaded product images directory
├── static/               # Static assets
│   ├── login.css         # Login page styling
│   ├── login.js          # Login page functionality
│   ├── script.js         # Global JavaScript functionality
│   └── style.css         # Global styling
└── HTML Pages/
    ├── index.html        # Homepage/Catalog view
    ├── login.html        # Authentication page
    ├── catalogo.html     # Product catalog/listing
    ├── producto.html     # Individual product details page
    ├── carrito.html      # Shopping cart page
    └── vender.html       # Seller/Product upload page
```

## Core Features

### 1. Product Management
- **List Products** (`GET /api/productos`): Retrieve all products with details
- **Get Product** (`GET /api/productos/<id>`): Retrieve single product details
- **Create Product** (`POST /api/productos`): Add new product with optional image upload
- **Update Product** (`PUT /api/productos/<id>`): Modify existing product
- **Delete Product** (`DELETE /api/productos/<id>`): Remove product from catalog

### 2. Image Handling
- **Upload**: Secure file upload for product images
- **Serve**: Static image delivery via `/imagenes/<filename>` route
- **Validation**: Only PNG, JPG, JPEG, WEBP, and GIF formats allowed
- **Storage**: Files saved to `imagenes/` directory

### 3. Database Schema
**productos table**:
- `id` (INTEGER, PRIMARY KEY)
- `titulo` (TEXT, required)
- `tomo` (TEXT/NUMBER, required) - Volume/edition number
- `precio` (NUMERIC, required)
- `estado` (TEXT, required) - Product condition/status
- `descripcion` (TEXT, optional)
- `imagen` (TEXT, optional) - Filename of product image

## Frontend Architecture

### Pages
- **index.html**: Landing/homepage with catalog integration
- **login.html**: User authentication interface
- **catalogo.html**: Main product listing and browsing
- **producto.html**: Detailed product view with full information
- **carrito.html**: Shopping cart management
- **vender.html**: Seller dashboard for product listing/management

### Styling & Scripting
- **style.css**: Global application styling
- **login.css**: Login-specific styling
- **script.js**: Cross-page JavaScript functionality
- **login.js**: Authentication logic

## API Endpoints

### Products
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/productos` | List all products |
| GET | `/api/productos/<id>` | Get product details |
| POST | `/api/productos` | Create new product |
| PUT | `/api/productos/<id>` | Update product |
| DELETE | `/api/productos/<id>` | Delete product |

### Static Files
| Endpoint | Purpose |
|----------|---------|
| `/imagenes/<filename>` | Serve product images |

## Configuration

### File Upload Settings
- **Upload Directory**: `imagenes/` (auto-created if missing)
- **Allowed Extensions**: `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`
- **File Name Security**: Uses Werkzeug's `secure_filename()`

### Database
- **Location**: `db_mangas1.0.db` (in project root)
- **Type**: SQLite
- **Row Factory**: Enabled for dict-like row access

## Development Workflow

1. **Setup**: Install dependencies from `requirements.txt`
2. **Database**: Ensure `db_mangas1.0.db` exists with `productos` table
3. **Images**: `imagenes/` directory is auto-created on first run
4. **Run**: Start Flask application with `python app.py`
5. **Access**: Frontend pages served statically; API endpoints return JSON

## Request/Response Format

### Successful Product Response
```json
{
  "id": 1,
  "titulo": "One Piece",
  "tomo": "105",
  "precio": "15.99",
  "estado": "nuevo",
  "descripcion": "Latest edition",
  "imagen": "onepiece_105.jpg"
}
```

### Error Response
```json
{
  "error": "Descriptive error message"
}
```

## Security Features
- **CORS Enabled**: Cross-origin requests handled by Flask-CORS
- **File Validation**: Filename sanitization and extension whitelist
- **Prepared Statements**: SQLite queries use parameterized statements to prevent SQL injection
- **Input Validation**: Required field checking before database operations

## Future Enhancement Opportunities
- User authentication and authorization system
- Shopping cart persistence (session-based or database)
- Payment integration
- Order management system
- Product reviews and ratings
- Search and filtering functionality
- Inventory tracking
- Admin dashboard
- User profiles and seller verification
