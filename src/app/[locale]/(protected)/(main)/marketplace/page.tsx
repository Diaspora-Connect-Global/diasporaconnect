"use client";
import React, { useState } from 'react';
import { ShoppingCart, Star, Heart, Search, ChevronLeft, ChevronRight, Plus, Minus, Trash2, CheckCircle } from 'lucide-react';
import { SearchInput } from '@/components/custom/input';

// Types
interface Product {
  id: string;
  name: string;
  price: number;
  rating: number;
  reviews: number;
  image: string;
  seller: string;
  colors?: string[];
  category: string;
  isService?: boolean;
  priceType?: 'fixed' | 'hourly';
}

interface CartItem extends Product {
  quantity: number;
  size?: string;
  color?: string;
  projectDuration?: number;
  selectedPackage?: 'basic' | 'standard' | 'premium';
  extras?: string[];
}

interface ShippingAddress {
  name: string;
  address: string;
  city: string;
  country: string;
  phoneNumber: string;
}

// Sample Products Data
const products: Product[] = [
  { id: '1', name: "Men's leather shoe", price: 520, rating: 5, reviews: 201, image: '🥾', seller: 'Joshua Kabu', colors: ['Brown', 'Black'], category: 'shoes', isService: false },
  { id: '2', name: "Women's running sneakers", price: 280, rating: 4.5, reviews: 150, image: '👟', seller: 'Sarah Jane', category: 'shoes', isService: false },
  { id: '3', name: "Kids' canvas shoes", price: 150, rating: 4.8, reviews: 98, image: '👟', seller: 'Fashion Now', category: 'shoes', isService: false },
  { id: '4', name: "Unisex hiking boots", price: 450, rating: 4.2, reviews: 215, image: '🥾', seller: 'Joshua Kabu', category: 'shoes', isService: false },
];

const services: Product[] = [
  { id: 's1', name: 'Virtual assistance', price: 150, rating: 5, reviews: 201, image: '👨‍💼', seller: 'Joshua Kabu', category: 'service', isService: true, priceType: 'hourly' }
];



// Header Component
const Header: React.FC<{ cartCount: number; onCartClick: () => void, setActiveTab: (item: 'products' | 'services') => void; activeTab: string }> = ({ cartCount, onCartClick, setActiveTab, activeTab }) => (
  <div className="h-full flex flex-col justify-between space-y-6 sticky top-0 bg-background z-10">
    <div className="max-w-7xl flex justify-between">
      <h1 className="text-2xl font-bold">Marketplace</h1>
      <button onClick={onCartClick} className="flex items-center gap-2">
        <ShoppingCart className="w-5 h-5" />
        <span>Cart</span>
        {cartCount > 0 && (
          <span className="text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {cartCount}
          </span>
        )}
      </button>
    </div>


    <div className="flex mt-auto justify-between border-b">
      <div>
        <button
          onClick={() => setActiveTab('products')}
          className={`p-2 font-medium ${activeTab === 'products' ? 'border-b-2 border-border-brand' : 'text-gray-600'}`}
        >
          Products
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={`p-2 font-medium ${activeTab === 'services' ? 'border-b-2 border-border-brand' : 'text-gray-600'}`}
        >
          Services
        </button>
      </div>
      <div className="h-[5vh]">
        <SearchInput
          placeholder={'searchPeople'}
          value={"searchTerm"}
          onChange={() => { }}
          onSearch={() => { }}
          bg="bg-surface-default"
        />
      </div>
    </div>
  </div>
);

// Product Card Component
const ProductCard: React.FC<{
  product: Product;
  onAddToCart: (product: Product | CartItem) => void;
}> = ({ product, onAddToCart }) => {
  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product);
  };

  return (
    <div className="">
      <div className="relative mb-3">
        <div className="rounded-4xl h-48 flex items-center justify-center text-6xl border-1">
          {product.image}
        </div>
        <button className="absolute top-2 right-2 rounded-full p-2">
          <Heart className="w-5 h-5 text-gray-400" />
        </button>
      </div>
      <div className='flex'>
        <h3 className="font-semibold mb-1">{product.name}</h3>
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          <span className="text-sm font-medium text-primary">{product.rating}</span>
          <span className="text-sm text-secondary">({product.reviews})</span>
        </div>

      </div>
      <p className="text-sm text-gray-600 mb-2">Accra,ghana</p>
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold">GH₵{product.price.toFixed(2)}</span>
        <button
          onClick={handleAddClick}
          className="bg-surface-brand text-text-white rounded-full p-2"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <p className="text-sm text-text-secondary mb-2">{product.seller}</p>

    </div>
  );
};

// Service Detail Component
const ServiceDetail: React.FC<{
  service: Product;
  onBack: () => void;
  onContinue: (item: CartItem) => void;
}> = ({ service, onBack, onContinue }) => {
  const [projectDuration, setProjectDuration] = useState<number>(0);
  const [selectedPackage, setSelectedPackage] = useState<'basic' | 'standard' | 'premium'>('basic');
  const [quantity, setQuantity] = useState(1);
  const [showExtras, setShowExtras] = useState(false);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);

  const packages = {
    basic: { price: 150, features: ['Feature 1', 'Feature 2', 'Feature 3', 'Feature 4', 'Feature 5'] },
    standard: { price: 300, features: ['Feature 1', 'Feature 2', 'Feature 3', 'Feature 4', 'Feature 5'] },
    premium: { price: 450, features: ['Feature 1', 'Feature 2', 'Feature 3', 'Feature 4', 'Feature 5', 'Feature 6'] }
  };

  const extras = [
    { id: 'source', name: 'Include source file', description: 'You will get original file you can use to edit the performance', price: 125 },
    { id: 'source2', name: 'Include source file', description: 'You will get original file you can use to edit the performance', price: 125 }
  ];

  const toggleExtra = (extraId: string) => {
    setSelectedExtras(prev =>
      prev.includes(extraId) ? prev.filter(id => id !== extraId) : [...prev, extraId]
    );
  };

  const handleContinue = () => {
    onContinue({
      ...service,
      quantity,
      projectDuration,
      selectedPackage,
      extras: selectedExtras,
      price: packages[selectedPackage].price
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-600 mb-4 hover:text-gray-800">
        <ChevronLeft className="w-5 h-5" />
        <span>{service.name}</span>
      </button>
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center text-9xl mb-4">
            {service.image}
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-100 rounded-lg w-20 h-20 flex items-center justify-center text-3xl cursor-pointer hover:ring-2 ring-blue-500">
                {service.image}
              </div>
            ))}
          </div>
          <div className="mt-6">
            <h3 className="font-semibold mb-2">About service</h3>
            <p className="text-sm text-gray-600">
              Introducing our premium men&apos;s leather shoe, crafted from high-quality materials for durability and style. With a sleek design and comfortable fit, these shoes are perfect for both formal and casual occasions. Elevate your wardrobe with this essential footwear that combines elegance and practicality.
            </p>
          </div>
        </div>
        <div>
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <span className="text-sm text-gray-600">{service.seller}</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">{service.name}</h2>
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{service.rating}</span>
                <span className="text-gray-500">({service.reviews})</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="p-2 rounded-full hover:bg-gray-100">
                <Heart className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-full hover:bg-gray-100">
                <Search className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label className="block font-semibold mb-2">Project duration (in hours)</label>
            <input
              type="number"
              value={projectDuration}
              onChange={(e) => setProjectDuration(Number(e.target.value))}
              placeholder="Enter how long the project will last in hours"
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <div className="mb-6">
            <label className="block font-semibold mb-2">Packages</label>
            <div className="space-y-3">
              {Object.entries(packages).map(([key, pkg]) => (
                <div
                  key={key}
                  onClick={() => setSelectedPackage(key as 'basic' | 'standard' | 'premium')}
                  className={`border rounded-lg p-4 cursor-pointer ${selectedPackage === key ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold capitalize">{key}</span>
                    <span className="font-bold">GH₵{pkg.price.toFixed(2)}</span>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {pkg.features.map((feature, idx) => (
                      <li key={idx}>✓ {feature}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold mb-2">Quantity</h3>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-2 border rounded hover:bg-gray-100"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-lg font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="p-2 border rounded hover:bg-gray-100"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <button
            onClick={handleContinue}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 mb-4"
          >
            Continue
          </button>

          <button
            onClick={() => setShowExtras(true)}
            className="w-full border border-blue-600 text-blue-600 py-3 rounded-lg hover:bg-blue-50"
          >
            Add extras
          </button>
        </div>
      </div>

      {showExtras && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Add extras</h3>
              <button onClick={() => setShowExtras(false)} className="text-gray-500 hover:text-gray-700 text-2xl">
                &times;
              </button>
            </div>
            <div className="space-y-4 mb-6">
              {extras.map(extra => (
                <label key={extra.id} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedExtras.includes(extra.id)}
                    onChange={() => toggleExtra(extra.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">{extra.name}</span>
                      <span className="font-bold">GH₵{extra.price.toFixed(2)}</span>
                    </div>
                    <p className="text-sm text-gray-600">{extra.description}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExtras(false)}
                className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50"
              >
                I don&apos;t want extra services
              </button>
              <button
                onClick={() => {
                  setShowExtras(false);
                  handleContinue();
                }}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                Add extras (GH₵ {selectedExtras.length * 125}.00)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Product Detail Component
const ProductDetail: React.FC<{
  product: Product;
  onBack: () => void;
  onAddToCart: (item: Product | CartItem) => void;
}> = ({ product, onBack, onAddToCart }) => {
  const [selectedSize, setSelectedSize] = useState('M');
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0] || '');

  const sizes = ['SM', 'M', 'LG', 'XL', 'XXL'];

  const handleAddToCart = () => {
    onAddToCart({
      ...product,
      quantity,
      size: selectedSize,
      color: selectedColor
    });
  };

  return (

    <>
      <div className='h-[10%] flex items-center text-center'>
        <button onClick={onBack} className="flex items-center gap-2 text-primary cursor-pointer">
          <ChevronLeft className="w-5 h-5" />
          <span>{product.name}</span>
        </button>
      </div>

      <div className="h-[90%] overflow-y-auto max-w-7xl mx-auto px-4 py-6 scrollbar-hide">

        <div className="grid lg:grid-cols-2 gap-8">
          {/** left side */}
          <div >
          <div className="flex space-x-2">
            <div className="flex flex-col gap-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="border-1 rounded-lg w-20 h-20 flex items-center justify-center text-3xl cursor-pointer hover:ring-2 ring-text-brand">
                  {product.image}
                </div>
              ))}
            </div>
            <div className="border-1 w-full rounded-lg h-96 flex items-center justify-center text-9xl mb-4">
              {product.image}
            </div>
          </div>

          
            <div className="p-2 rounded-lg">
              <h3 className="font-semibold mb-2">About product</h3>
              <p className="text-sm text-gray-600">
                A classic men&apos;s leather shoe, crafted from high-quality materials for durability and style. With a sleek design and comfortable fit, these shoes are perfect for both formal and casual occasions. Elevate your wardrobe with this essential footwear that combines elegance and practicality.
              </p>
            </div>

          </div>

                    {/** right side */}

          <div>
                        <p className="text-sm text-gray-600 mb-4">By {product.seller}</p>

            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">{product.name}</h2>
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{product.rating}</span>
                  <span className="text-gray-500">({product.reviews})</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 rounded-full">
                  <Heart className="w-5 h-5" />
                </button>
                <button className="p-2 rounded-full">
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </div>
            <p className="text-3xl font-bold mb-6">GH₵{product.price.toFixed(2)}</p>

            <div className="mb-6">
              <h3 className="font-semibold mb-2">Size</h3>
              <div className="flex gap-2">
                {sizes.map(size => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-2 py-1 border rounded-xl ${selectedSize === size ? 'border-brand text-brand' : 'border-gray-300'}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold mb-2">Quantity</h3>
              <div className="flex items-center gap-4 border-1 w-fit px-8 py-5 rounded-full text-text-brand border-brand">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 rounded"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-lg font-medium text-primary">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2 rounded"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex gap-4 mb-6">
              <button onClick={handleAddToCart} className="flex-1 bg-text-primary text-text-white py-3 rounded-full">
                Add to cart
              </button>
              <button className="flex-1 bg-surface-brand text-text-white py-3 rounded-full">
                Buy now
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

// Shopping Cart Component
const ShoppingCartModal: React.FC<{
  cart: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: () => void;
}> = ({ cart, onClose, onUpdateQuantity, onRemoveItem, onCheckout }) => {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="fixed inset-0 bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-default rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">Shopping cart</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Items in cart</h3>
            <span className="text-sm text-gray-600">Number of items: {cart.length}</span>
          </div>
          {cart.map(item => (
            <div key={item.id} className="flex gap-4 mb-4 pb-4 border-b">
              <div className="bg-gray-100 rounded w-20 h-20 flex items-center justify-center text-3xl flex-shrink-0">
                {item.image}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">{item.name}</h4>
                <p className="text-sm text-gray-600 mb-2">{item.seller}</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                    className="p-1 border rounded"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-medium">{item.quantity}</span>
                  <button
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    className="p-1 border rounded"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold mb-2">GH₵{(item.price * item.quantity).toFixed(2)}</p>
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          <div className="mt-6 text-right">
            <p className="text-sm text-gray-600 mb-1">ONE TIME FEE: GH₵20.00</p>
            <p className="text-2xl font-bold mb-4">Total: GH₵{(total + 20).toFixed(2)}</p>
            <button
              onClick={onCheckout}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
            >
              Proceed to checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Service Checkout Component
const ServiceCheckout: React.FC<{
  serviceItem: CartItem;
  onBack: () => void;
  onComplete: () => void;
}> = ({ serviceItem, onBack, onComplete }) => {
  const [paymentMethod, setPaymentMethod] = useState('credit');
  const [billingAddress, setBillingAddress] = useState({
    name: '',
    address: '',
    city: '',
    country: '',
    phoneNumber: ''
  });

  const packagePrice = serviceItem.price * serviceItem.quantity;
  const extrasPrice = (serviceItem.extras?.length || 0) * 125;
  const serviceFee = 50;
  const total = packagePrice + extrasPrice + serviceFee;

  const handlePay = () => {
    onComplete();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-600 mb-4 hover:text-gray-800">
        <ChevronLeft className="w-5 h-5" />
        <span>Checkout</span>
      </button>
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="font-semibold mb-4">Order details</h3>
            <div className="flex gap-4 mb-4">
              <div className="bg-gray-100 rounded w-16 h-16 flex items-center justify-center text-2xl flex-shrink-0">
                {serviceItem.image}
              </div>
              <div className="flex-1">
                <p className="font-medium mb-1">I will develop a revenue strategy for your business</p>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                  <span>{serviceItem.seller}</span>
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Premium package (GH₵{packagePrice.toFixed(2)})</p>
            </div>
            {serviceItem.extras && serviceItem.extras.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-sm font-medium mb-1">Extras</p>
                <p className="text-sm text-gray-600">Include source file</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="font-semibold mb-4">Payment details</h3>
            <button className="flex items-center justify-between w-full p-4 border rounded-lg mb-3 hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border rounded flex items-center justify-center">
                  💳
                </div>
                <span>Credit card</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button className="flex items-center justify-between w-full p-4 border rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border rounded flex items-center justify-center">
                  📱
                </div>
                <span>Mobile payment</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4">Billing address</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  placeholder="Name"
                  value={billingAddress.name}
                  onChange={(e) => setBillingAddress({ ...billingAddress, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <input
                  type="text"
                  placeholder="Name"
                  value={billingAddress.address}
                  onChange={(e) => setBillingAddress({ ...billingAddress, address: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">City</label>
                  <input
                    type="text"
                    placeholder="Name"
                    value={billingAddress.city}
                    onChange={(e) => setBillingAddress({ ...billingAddress, city: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Country</label>
                  <select
                    value={billingAddress.country}
                    onChange={(e) => setBillingAddress({ ...billingAddress, country: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="">Select country</option>
                    <option value="GH">Ghana</option>
                    <option value="NG">Nigeria</option>
                    <option value="KE">Kenya</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone number</label>
                <div className="flex gap-2">
                  <select className="px-3 py-2 border rounded-lg">
                    <option>🇬🇭 +233</option>
                  </select>
                  <input
                    type="tel"
                    placeholder="50 000 0000"
                    value={billingAddress.phoneNumber}
                    onChange={(e) => setBillingAddress({ ...billingAddress, phoneNumber: e.target.value })}
                    className="flex-1 px-4 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-24">
            <h3 className="font-semibold mb-4">Price summary</h3>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">{serviceItem.name}</span>
                <span className="font-medium">GH₵{packagePrice.toFixed(2)}</span>
              </div>
              {serviceItem.extras && serviceItem.extras.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Include source file</span>
                  <span className="font-medium">GH₵{extrasPrice.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Service fee</span>
                <span className="font-medium">GH₵{serviceFee.toFixed(2)}</span>
              </div>
            </div>
            <div className="border-t pt-4 mb-6">
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>GH₵{total.toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={handlePay}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
            >
              Pay GH₵ {total.toFixed(2)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Checkout Component
const Checkout: React.FC<{
  cart: CartItem[];
  onBack: () => void;
  onComplete: () => void;
}> = ({ cart, onBack, onComplete }) => {
  const [paymentMethod, setPaymentMethod] = useState('credit');
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    name: '',
    address: '',
    city: '',
    country: '',
    phoneNumber: ''
  });

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = 20;
  const total = subtotal + shippingFee;

  const handleSubmit = () => {
    onComplete();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-600 mb-4 hover:text-gray-800">
        <ChevronLeft className="w-5 h-5" />
        <span>Checkout</span>
      </button>
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <div>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="font-semibold mb-4">Order details</h3>
              {cart.map(item => (
                <div key={item.id} className="flex gap-3 mb-3">
                  <div className="bg-gray-100 rounded w-16 h-16 flex items-center justify-center text-2xl">
                    {item.image}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-600">{item.seller}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="font-semibold mb-4">Payment method</h3>
              <label className="flex items-center gap-3 mb-3 cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  value="credit"
                  checked={paymentMethod === 'credit'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <span>Credit card</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  value="debit"
                  checked={paymentMethod === 'debit'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <span>Debit/payment</span>
              </label>
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="font-semibold mb-4">Shipping address</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Name"
                  value={shippingAddress.name}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
                <input
                  type="text"
                  placeholder="Address"
                  value={shippingAddress.address}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, address: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="City"
                    value={shippingAddress.city}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                    className="px-4 py-2 border rounded-lg"
                    required
                  />
                  <select
                    value={shippingAddress.country}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })}
                    className="px-4 py-2 border rounded-lg"
                    required
                  >
                    <option value="">Country</option>
                    <option value="GH">Ghana</option>
                    <option value="NG">Nigeria</option>
                    <option value="KE">Kenya</option>
                  </select>
                </div>
                <input
                  type="tel"
                  placeholder="Phone number"
                  value={shippingAddress.phoneNumber}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, phoneNumber: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-4">Billing address</h3>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked />
                <span className="text-sm">Same as shipping address</span>
              </label>
            </div>
          </div>
        </div>

        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-24">
            <h3 className="font-semibold mb-4">Price summary</h3>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal amount</span>
                <span>GH₵{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping fee</span>
                <span>GH₵{shippingFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Discount</span>
                <span>GH₵0.00</span>
              </div>
            </div>
            <div className="border-t pt-4 mb-6">
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>GH₵{total.toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={handleSubmit}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
            >
              Pay GH₵{total.toFixed(2)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Order Success Component
const OrderSuccess: React.FC<{
  cart: CartItem[];
  onBackToHome: () => void;
}> = ({ cart, onBackToHome }) => {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0) + 20;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-center">
      <div className="bg-white rounded-lg shadow p-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Your order payment successfully</h2>
        <p className="text-gray-600 mb-8">Order details</p>

        <div className="text-left mb-8">
          {cart.map(item => (
            <div key={item.id} className="flex gap-3 mb-4">
              <div className="bg-gray-100 rounded w-16 h-16 flex items-center justify-center text-2xl">
                {item.image}
              </div>
              <div className="flex-1">
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-gray-600">{item.seller}</p>
              </div>
              <p className="font-bold">GH₵{(item.price * item.quantity).toFixed(2)}</p>
            </div>
          ))}
        </div>

        <div className="border-t pt-6 mb-8">
          <div className="grid grid-cols-2 gap-4 text-sm mb-2">
            <div className="text-left">
              <p className="text-gray-600 mb-4">Shipping address</p>
              <p>Jane Doe</p>
              <p>Kumasi, Ghana - Danyame-Nhyianso</p>
              <p>PO 233-543-8392</p>
            </div>
            <div className="text-left">
              <p className="text-gray-600 mb-4">Billing address</p>
              <p>Jane Doe</p>
              <p>Kumasi, Ghana - Danyame-Nhyianso</p>
              <p>PO 233-543-8392</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm mt-6">
            <div className="text-left">
              <p className="text-gray-600">Payment method</p>
              <p>Visa ending in 1234</p>
            </div>
            <div className="text-right">
              <p className="text-gray-600">Subtotal:</p>
              <p className="text-gray-600">Shipping fee:</p>
              <p className="font-bold text-lg">Total:</p>
            </div>
            <div></div>
            <div className="text-right">
              <p>GH₵{(total - 20).toFixed(2)}</p>
              <p>GH₵20.00</p>
              <p className="font-bold text-lg">GH₵{total.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <button
          onClick={onBackToHome}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700"
        >
          Done order
        </button>
      </div>
    </div>
  );
};

// Main App Component
const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'home' | 'product' | 'service' | 'cart' | 'checkout' | 'service-checkout' | 'success'>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'services'>('products');
  const [selectedServiceItem, setSelectedServiceItem] = useState<CartItem | null>(null);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    if (product.isService) {
      setCurrentView('service');
    } else {
      setCurrentView('product');
    }
  };

  const handleAddToCart = (item: Product | CartItem) => {
    // Convert Product to CartItem if needed
    const cartItem: CartItem = 'quantity' in item ? item : { ...item, quantity: 1 };

    const existingItem = cart.find(i => i.id === cartItem.id);
    if (existingItem) {
      setCart(cart.map(i => i.id === cartItem.id ? { ...i, quantity: i.quantity + cartItem.quantity } : i));
    } else {
      setCart([...cart, cartItem]);
    }
    setShowCart(true);
  };

  const handleServiceContinue = (item: CartItem) => {
    setSelectedServiceItem(item);
    setCurrentView('service-checkout');
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    setCart(cart.map(item => item.id === id ? { ...item, quantity } : item));
  };

  const handleRemoveItem = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const handleCheckout = () => {
    setShowCart(false);
    setCurrentView('checkout');
  };

  const handleOrderComplete = () => {
    setCurrentView('success');
  };

  const handleBackToHome = () => {
    setCart([]);
    setCurrentView('home');
    setSelectedProduct(null);
  };

  return (
    <div className="h-app-inner px-[10%]">


      {currentView === 'home' && (

        <div className='h-full'>
          <div className='h-[20%]'>
            <Header cartCount={cart.length} onCartClick={() => setShowCart(true)} setActiveTab={setActiveTab} activeTab={activeTab} />
          </div>
          <div className="max-w-7xl mx-auto px-4 py-6 h-[80%] overflow-y-auto scrollbar-hide">

            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">
                  {activeTab === 'products' ? 'Trending' : 'Services you may like'}
                </h2>
                <div className="flex gap-2">
                  <button className="p-2 border rounded-full hover:bg-gray-100">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button className="p-2 border rounded-full hover:bg-gray-100">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                {(activeTab === 'products' ? products : services).map(item => (
                  <div key={item.id} onClick={() => handleProductClick(item)} className="cursor-pointer">
                    <ProductCard product={item} onAddToCart={handleAddToCart} />
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

      )}

      <div className='h-full'>

        {currentView === 'product' && selectedProduct && (
          <ProductDetail
            product={selectedProduct}
            onBack={() => setCurrentView('home')}
            onAddToCart={handleAddToCart}
          />
        )}


      </div>

      {currentView === 'service' && selectedProduct && (
        <ServiceDetail
          service={selectedProduct}
          onBack={() => setCurrentView('home')}
          onContinue={handleServiceContinue}
        />
      )}

      {currentView === 'checkout' && (
        <Checkout
          cart={cart}
          onBack={() => setCurrentView('home')}
          onComplete={handleOrderComplete}
        />
      )}

      {currentView === 'service-checkout' && selectedServiceItem && (
        <ServiceCheckout
          serviceItem={selectedServiceItem}
          onBack={() => setCurrentView('service')}
          onComplete={handleOrderComplete}
        />
      )}

      {currentView === 'success' && (
        <OrderSuccess cart={cart} onBackToHome={handleBackToHome} />
      )}

      {showCart && (
        <ShoppingCartModal
          cart={cart}
          onClose={() => setShowCart(false)}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onCheckout={handleCheckout}
        />
      )}


    </div>
  );
};

export default App;
