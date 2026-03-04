import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const dotenv = require('dotenv');
import { join } from 'path';
import { UserRole } from '@menufacil/shared';

dotenv.config({ path: join(__dirname, '..', '..', '..', '..', '..', '.env') });

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'menufacil',
    password: process.env.DB_PASSWORD || 'menufacil123',
    database: process.env.DB_DATABASE || 'menufacil',
    entities: [join(__dirname, '..', '..', 'modules', '**', 'entities', '*.entity.{ts,js}')],
    synchronize: true,
  });

  await dataSource.initialize();
  console.log('📦 Database connected');

  // Create test tenant
  const tenantRepo = dataSource.getRepository('Tenant');
  let tenant = await tenantRepo.findOne({ where: { slug: 'pizza-express' } });

  if (!tenant) {
    tenant = await tenantRepo.save({
      name: 'Pizza Express',
      slug: 'pizza-express',
      primary_color: '#FF6B35',
      phone: '(11) 99999-0000',
      address: 'Rua das Pizzas, 123 - São Paulo, SP',
      business_hours: {
        monday: { open: '11:00', close: '23:00' },
        tuesday: { open: '11:00', close: '23:00' },
        wednesday: { open: '11:00', close: '23:00' },
        thursday: { open: '11:00', close: '23:00' },
        friday: { open: '11:00', close: '00:00' },
        saturday: { open: '11:00', close: '00:00' },
        sunday: { open: '11:00', close: '22:00' },
      },
      min_order_value: 25,
      is_active: true,
    });
    console.log('✅ Tenant "Pizza Express" created');
  } else {
    console.log('⏭️  Tenant "Pizza Express" already exists');
  }

  // Create admin user
  const userRepo = dataSource.getRepository('User');
  let admin = await userRepo.findOne({ where: { email: 'admin@menufacil.com' } });

  if (!admin) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    admin = await userRepo.save({
      name: 'Admin',
      email: 'admin@menufacil.com',
      password_hash: passwordHash,
      role: UserRole.ADMIN,
      tenant_id: (tenant as any).id,
      is_active: true,
    });
    console.log('✅ Admin user created (admin@menufacil.com / admin123)');
  } else {
    console.log('⏭️  Admin user already exists');
  }

  // Create default customer "Consumidor Final"
  const customerRepo = dataSource.getRepository('Customer');
  let defaultCustomer = await customerRepo.findOne({
    where: { phone: '0000000000', tenant_id: (tenant as any).id },
  });

  if (!defaultCustomer) {
    defaultCustomer = await customerRepo.save({
      name: 'Consumidor Final',
      phone: '0000000000',
      tenant_id: (tenant as any).id,
    });
    console.log('✅ Default customer "Consumidor Final" created');
  } else {
    console.log('⏭️  Default customer already exists');
  }

  // Create delivery zones by neighborhood
  const zoneRepo = dataSource.getRepository('DeliveryZone');
  const existingZones = await zoneRepo.find({ where: { tenant_id: (tenant as any).id } });

  if (existingZones.length === 0) {
    const zones = [
      {
        name: 'Centro e Região',
        fee: 5.0,
        neighborhoods: ['Centro', 'Boa Vista', 'República', 'Sé', 'Liberdade', 'Bela Vista'],
        polygon: [],
        min_delivery_time: 20,
        max_delivery_time: 40,
      },
      {
        name: 'Zona Sul',
        fee: 8.0,
        neighborhoods: ['Vila Mariana', 'Saúde', 'Moema', 'Ipiranga', 'Jabaquara', 'Campo Belo'],
        polygon: [],
        min_delivery_time: 30,
        max_delivery_time: 50,
      },
      {
        name: 'Zona Oeste',
        fee: 10.0,
        neighborhoods: ['Pinheiros', 'Perdizes', 'Lapa', 'Alto de Pinheiros', 'Butantã', 'Vila Madalena'],
        polygon: [],
        min_delivery_time: 35,
        max_delivery_time: 60,
      },
      {
        name: 'Zona Norte',
        fee: 12.0,
        neighborhoods: ['Santana', 'Tucuruvi', 'Mandaqui', 'Casa Verde', 'Vila Guilherme', 'Tremembé'],
        polygon: [],
        min_delivery_time: 40,
        max_delivery_time: 70,
      },
    ];

    for (const zone of zones) {
      await zoneRepo.save({
        ...zone,
        tenant_id: (tenant as any).id,
      });
    }
    console.log('✅ Delivery zones created (4 zones with neighborhoods)');
  } else {
    console.log('⏭️  Delivery zones already exist');
  }

  // Create sample categories
  const categoryRepo = dataSource.getRepository('Category');
  const existingCategories = await categoryRepo.find({ where: { tenant_id: (tenant as any).id } });

  if (existingCategories.length === 0) {
    const categories = [
      { name: 'Pizzas Tradicionais', description: 'Nossas pizzas clássicas', sort_order: 1 },
      { name: 'Pizzas Especiais', description: 'Sabores premium', sort_order: 2 },
      { name: 'Bebidas', description: 'Refrigerantes, sucos e cervejas', sort_order: 3 },
      { name: 'Sobremesas', description: 'Doces e sobremesas', sort_order: 4 },
    ];

    for (const cat of categories) {
      await categoryRepo.save({
        ...cat,
        tenant_id: (tenant as any).id,
        is_active: true,
      });
    }
    console.log('✅ Sample categories created');
  }

  // Create sample products
  const productRepo = dataSource.getRepository('Product');
  const existingProducts = await productRepo.find({ where: { tenant_id: (tenant as any).id } });

  if (existingProducts.length === 0) {
    const cats = await categoryRepo.find({ where: { tenant_id: (tenant as any).id } });
    const pizzaTradicional = cats.find((c: any) => c.name === 'Pizzas Tradicionais');
    const pizzaEspecial = cats.find((c: any) => c.name === 'Pizzas Especiais');
    const bebidas = cats.find((c: any) => c.name === 'Bebidas');

    if (pizzaTradicional) {
      await productRepo.save([
        {
          name: 'Margherita',
          description: 'Molho de tomate, mussarela, manjericão fresco',
          base_price: 39.9,
          is_pizza: true,
          category_id: (pizzaTradicional as any).id,
          tenant_id: (tenant as any).id,
          sort_order: 1,
        },
        {
          name: 'Calabresa',
          description: 'Molho de tomate, mussarela, calabresa, cebola',
          base_price: 42.9,
          is_pizza: true,
          category_id: (pizzaTradicional as any).id,
          tenant_id: (tenant as any).id,
          sort_order: 2,
        },
        {
          name: 'Portuguesa',
          description: 'Molho de tomate, mussarela, presunto, ovo, cebola, ervilha',
          base_price: 45.9,
          is_pizza: true,
          category_id: (pizzaTradicional as any).id,
          tenant_id: (tenant as any).id,
          sort_order: 3,
        },
      ]);
    }

    if (pizzaEspecial) {
      await productRepo.save([
        {
          name: 'Quatro Queijos Premium',
          description: 'Mussarela, gorgonzola, provolone, parmesão',
          base_price: 55.9,
          is_pizza: true,
          category_id: (pizzaEspecial as any).id,
          tenant_id: (tenant as any).id,
          sort_order: 1,
        },
      ]);
    }

    if (bebidas) {
      await productRepo.save([
        {
          name: 'Coca-Cola 2L',
          description: 'Refrigerante Coca-Cola 2 litros',
          base_price: 12.9,
          is_pizza: false,
          category_id: (bebidas as any).id,
          tenant_id: (tenant as any).id,
          sort_order: 1,
        },
        {
          name: 'Guaraná Antarctica 2L',
          description: 'Refrigerante Guaraná Antarctica 2 litros',
          base_price: 10.9,
          is_pizza: false,
          category_id: (bebidas as any).id,
          tenant_id: (tenant as any).id,
          sort_order: 2,
        },
      ]);
    }

    console.log('✅ Sample products created');
  }

  await dataSource.destroy();
  console.log('🌱 Seed completed!');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
