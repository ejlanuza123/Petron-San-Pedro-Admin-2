import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import ProductModal from '../components/ProductModal';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('id');
    setProducts(data || []);
  };

  const handleSaveProduct = async (productData) => {
    // Construct payload from the data passed by the Modal component
    const payload = {
      name: productData.name,
      category: productData.category,
      current_price: parseFloat(productData.current_price),
      stock_quantity: parseInt(productData.stock_quantity),
      unit: productData.unit,
      description: productData.description
    };

    let error;
    if (editingProduct) {
      const { error: updateError } = await supabase
        .from('products')
        .update(payload)
        .eq('id', editingProduct.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('products')
        .insert([payload]);
      error = insertError;
    }

    if (error) {
      alert('Error saving product: ' + error.message);
      return;
    }

    setIsModalOpen(false);
    setEditingProduct(null);
    fetchProducts();
  };

  const handleDelete = async (id) => {
    if(!window.confirm("Are you sure you want to delete this product?")) return;
    
    const { error } = await supabase.from('products').delete().eq('id', id);
    if(error) alert('Error deleting product');
    else fetchProducts();
  }

  const openEdit = (product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const openAdd = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Inventory</h2>
        <button 
          onClick={openAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
        >
          <Plus size={18} /> <span className="hidden sm:inline">Add Product</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 relative group">
            <div className={`absolute top-4 right-4 px-2 py-1 text-xs font-bold rounded ${
              product.stock_quantity > 10 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {product.stock_quantity} {product.unit} left
            </div>

            <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-xl">
              {product.category === 'Fuel' ? '⛽' : '🛢️'}
            </div>
            
            <h3 className="font-bold text-gray-900">{product.name}</h3>
            <p className="text-sm text-gray-500 mb-2">{product.category}</p>
            <p className="font-bold text-blue-600 text-lg">₱{product.current_price}</p>

            <div className="mt-4 pt-4 border-t flex gap-2">
              <button 
                onClick={() => openEdit(product)}
                className="flex-1 bg-gray-50 text-gray-700 py-2 rounded hover:bg-gray-100 text-sm font-medium flex items-center justify-center gap-2"
              >
                <Edit2 size={14} /> Edit
              </button>
              <button 
                onClick={() => handleDelete(product.id)}
                className="bg-red-50 text-red-600 px-3 rounded hover:bg-red-100 flex items-center justify-center"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <ProductModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={editingProduct}
        onSave={handleSaveProduct}
      />
    </div>
  );
}