import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const checkCustomer = await this.customersRepository.findById(customer_id);

    if (!checkCustomer) {
      throw new AppError('Customer not found');
    }

    const checkProducts = await this.productsRepository.findAllById(
      products.map(product => ({
        id: product.id,
      })),
    );

    if (!checkProducts) {
      throw new AppError('Product not found');
    }

    const productsWithNoQuantity = checkProducts.filter(
      product =>
        product.quantity <
        (products.find(el => el.id === product.id)?.quantity || 0),
    );

    console.log(productsWithNoQuantity);

    if (productsWithNoQuantity.length > 0) {
      throw new AppError('Insufficient quantity for product');
    }
    /* checkProducts.forEach(checkProduct => {
      products.forEach(product => {
        if (product.id === checkProduct.id) {
          if (product.quantity > checkProduct.quantity) {
            throw new AppError(
              `Insufficient quantity for product ${checkProduct.name}`,
            );
          }
        }
      });
    }); */

    await this.productsRepository.updateQuantity(products);

    const orderProducts = checkProducts.map(product => ({
      product_id: product.id,
      price: product.price,
      quantity: products.find(el => el.id === product.id)?.quantity || 0,
    }));

    const order = await this.ordersRepository.create({
      customer: checkCustomer,
      products: orderProducts,
    });

    return order;
  }
}

export default CreateOrderService;
