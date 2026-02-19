// src/services/productService.js
import { supabase } from '../lib/supabase';

export const productService = {
  async getAll() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(product) {
    const { data, error } = await supabase
      .from('products')
      .insert([{
        ...product,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id, product) {
    const { data, error } = await supabase
      .from('products')
      .update({
        ...product,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async updateStock(id, quantity) {
    const { error } = await supabase
      .from('products')
      .update({ 
        stock_quantity: quantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) throw error;
  },

  async getLowStock(threshold = 10) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .lt('stock_quantity', threshold)
      .order('stock_quantity');
    
    if (error) throw error;
    return data;
  }
};