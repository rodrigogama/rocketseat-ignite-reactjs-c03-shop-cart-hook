import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const updateLocalStorageCart = (newCart: Product[]) => localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

  const addProduct = async (productId: number) => {
    try {
      const { data: productInStock } = await api.get(`/stock/${productId}`);
      if (!productInStock?.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
    
      const productInCart = cart.find(p => p.id === productId);
      if (productInCart) {
        updateProductAmount({ productId, amount: productInCart.amount + 1 });
        return;
      }

      const { data: productToAdd } = await api.get(`/products/${productId}`);
      if (productToAdd) {
        productToAdd.amount = 1;
        const newCart = [...cart, productToAdd];

        updateLocalStorageCart(newCart);
        setCart(newCart);
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productInCart = cart.find(p => p.id === productId);
      if (!productInCart) throw new Error('Produto não existe');

      const newCart = cart.filter(p => p.id !== productId);
      updateLocalStorageCart(newCart);
      setCart(newCart);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) throw new Error('Quantidade solicitada é invalida');

      const itemInStock = await api.get(`/stock/${productId}`).then(response => response.data);
      if (!itemInStock?.amount || itemInStock.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const newCart = cart.map(p => p.id === productId ? { ...p, amount } : p);
      updateLocalStorageCart(newCart);
      setCart(newCart);
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
