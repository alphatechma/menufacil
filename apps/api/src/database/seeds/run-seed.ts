import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { join } from 'path';
import { UserRole } from '@menufacil/shared';

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dotenv = require('dotenv');
  dotenv.config({ path: join(__dirname, '..', '..', '..', '..', '..', '.env') });
} catch {
  // dotenv not available in production — env vars already set
}

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

  const passwordHash = await bcrypt.hash('admin123', 10);

  // ==========================================
  // SUPER ADMIN USER
  // ==========================================
  const userRepo = dataSource.getRepository('User');
  let superAdmin = await userRepo.findOne({ where: { email: 'superadmin@menufacil.com' } });

  if (!superAdmin) {
    const saHash = await bcrypt.hash('super123', 10);
    superAdmin = await userRepo.save({
      name: 'Super Admin',
      email: 'superadmin@menufacil.com',
      password_hash: saHash,
      system_role: UserRole.SUPER_ADMIN,
      tenant_id: null,
      is_active: true,
    });
    console.log('✅ Super Admin user created (superadmin@menufacil.com / super123)');
  } else {
    console.log('⏭️  Super Admin user already exists');
  }

  // ==========================================
  // SYSTEM MODULES
  // ==========================================
  const moduleRepo = dataSource.getRepository('SystemModule');
  const defaultModules = [
    // Modulos administrativos (disponiveis em todos os planos)
    { key: 'dashboard', name: 'Dashboard', description: 'Painel principal com metricas e resumo' },
    { key: 'staff', name: 'Equipe', description: 'Gerenciamento de membros da equipe e perfis de acesso' },
    { key: 'settings', name: 'Configuracoes', description: 'Configuracoes gerais e personalizacao da loja' },
    // Modulos de funcionalidades (dependem do plano)
    { key: 'orders', name: 'Pedidos', description: 'Gerenciamento de pedidos' },
    { key: 'products', name: 'Produtos', description: 'Gerenciamento de produtos e cardapio' },
    { key: 'categories', name: 'Categorias', description: 'Gerenciamento de categorias' },
    { key: 'customers', name: 'Clientes', description: 'Gerenciamento de clientes' },
    { key: 'delivery', name: 'Delivery', description: 'Zonas de entrega e delivery' },
    { key: 'coupons', name: 'Cupons', description: 'Sistema de cupons de desconto' },
    { key: 'loyalty', name: 'Fidelidade', description: 'Programa de fidelidade e pontos' },
    { key: 'kds', name: 'KDS', description: 'Kitchen Display System' },
    { key: 'reports', name: 'Relatorios', description: 'Relatorios e analytics' },
    { key: 'delivery_driver', name: 'Painel Entregador', description: 'Painel do entregador para acompanhar e concluir entregas' },
    { key: 'pickup', name: 'Retirada', description: 'Pedidos para retirada no balcao' },
    { key: 'dine_in', name: 'Atendimento Presencial', description: 'Mesas, comandas, reservas e mapa do salao' },
    { key: 'waiter', name: 'Garcom', description: 'App do garcom para pedidos presenciais' },
  ];

  const savedModules: Record<string, any> = {};
  for (const mod of defaultModules) {
    let existing = await moduleRepo.findOne({ where: { key: mod.key } });
    if (!existing) {
      existing = await moduleRepo.save(mod);
      console.log(`✅ System module "${mod.key}" created`);
    } else {
      console.log(`⏭️  System module "${mod.key}" already exists`);
    }
    savedModules[mod.key] = existing;
  }

  // ==========================================
  // DEFAULT PLANS
  // ==========================================
  const planRepo = dataSource.getRepository('Plan');

  const defaultPlans = [
    {
      name: 'Basico',
      price: 99,
      max_users: 3,
      max_products: 50,
      moduleKeys: ['dashboard', 'staff', 'settings', 'orders', 'products', 'categories', 'customers', 'pickup'],
    },
    {
      name: 'Pro',
      price: 199,
      max_users: 10,
      max_products: 200,
      moduleKeys: ['dashboard', 'staff', 'settings', 'orders', 'products', 'categories', 'customers', 'delivery', 'coupons', 'kds', 'delivery_driver', 'pickup'],
    },
    {
      name: 'Enterprise',
      price: 399,
      max_users: null,
      max_products: null,
      moduleKeys: ['dashboard', 'staff', 'settings', 'orders', 'products', 'categories', 'customers', 'delivery', 'coupons', 'loyalty', 'kds', 'reports', 'delivery_driver', 'pickup', 'dine_in', 'waiter'],
    },
  ];

  const savedPlans: Record<string, any> = {};
  for (const planData of defaultPlans) {
    const { moduleKeys, ...planFields } = planData;
    let plan = await planRepo.findOne({ where: { name: planData.name }, relations: ['modules'] });
    if (!plan) {
      plan = await planRepo.save({
        ...planFields,
        modules: moduleKeys.map((key) => savedModules[key]).filter(Boolean),
      });
      console.log(`✅ Plan "${planData.name}" created (R$${planData.price})`);
    } else {
      // Update modules to include any new ones
      const existingKeys = new Set((plan as any).modules?.map((m: any) => m.key) || []);
      const missingModules = moduleKeys.filter((key) => !existingKeys.has(key)).map((key) => savedModules[key]).filter(Boolean);
      if (missingModules.length > 0) {
        (plan as any).modules = [...((plan as any).modules || []), ...missingModules];
        await planRepo.save(plan);
        console.log(`🔄 Plan "${planData.name}" updated with modules: ${missingModules.map((m: any) => m.key).join(', ')}`);
      } else {
        console.log(`⏭️  Plan "${planData.name}" already up to date`);
      }
    }
    savedPlans[planData.name] = plan;
  }

  // ==========================================
  // DEFAULT PERMISSIONS
  // ==========================================
  const permissionRepo = dataSource.getRepository('Permission');

  const permissionsByModule: Record<string, { key: string; name: string }[]> = {
    // ── Modulos administrativos ──
    dashboard: [
      { key: 'dashboard:read', name: 'Ver Dashboard' },
    ],
    staff: [
      // Equipe
      { key: 'staff:read', name: 'Ver Equipe' },
      { key: 'staff:create', name: 'Criar Membro' },
      { key: 'staff:update', name: 'Editar Membro' },
      { key: 'staff:delete', name: 'Remover Membro' },
      // Perfis de Acesso
      { key: 'roles:read', name: 'Ver Perfis de Acesso' },
      { key: 'roles:create', name: 'Criar Perfil de Acesso' },
      { key: 'roles:update', name: 'Editar Perfil de Acesso' },
      { key: 'roles:delete', name: 'Remover Perfil de Acesso' },
    ],
    settings: [
      // Configuracoes
      { key: 'settings:read', name: 'Ver Configuracoes' },
      { key: 'settings:update', name: 'Editar Configuracoes' },
      // Personalizacao
      { key: 'customization:read', name: 'Ver Personalizacao' },
      { key: 'customization:update', name: 'Editar Personalizacao' },
    ],
    // ── Modulos de funcionalidades ──
    products: [
      { key: 'product:create', name: 'Criar Produto' },
      { key: 'product:read', name: 'Ver Produtos' },
      { key: 'product:update', name: 'Editar Produto' },
      { key: 'product:delete', name: 'Remover Produto' },
    ],
    categories: [
      { key: 'category:create', name: 'Criar Categoria' },
      { key: 'category:read', name: 'Ver Categorias' },
      { key: 'category:update', name: 'Editar Categoria' },
      { key: 'category:delete', name: 'Remover Categoria' },
    ],
    orders: [
      { key: 'order:create', name: 'Criar Pedido' },
      { key: 'order:read', name: 'Ver Pedidos' },
      { key: 'order:update', name: 'Atualizar Pedido' },
      { key: 'order:cancel', name: 'Cancelar Pedido' },
    ],
    customers: [
      { key: 'customer:create', name: 'Criar Cliente' },
      { key: 'customer:read', name: 'Ver Clientes' },
      { key: 'customer:update', name: 'Editar Cliente' },
      { key: 'customer:delete', name: 'Remover Cliente' },
    ],
    delivery: [
      { key: 'delivery:create', name: 'Criar Zona de Entrega' },
      { key: 'delivery:read', name: 'Ver Zonas de Entrega' },
      { key: 'delivery:update', name: 'Editar Zona de Entrega' },
      { key: 'delivery:delete', name: 'Remover Zona de Entrega' },
    ],
    coupons: [
      { key: 'coupon:create', name: 'Criar Cupom' },
      { key: 'coupon:read', name: 'Ver Cupons' },
      { key: 'coupon:update', name: 'Editar Cupom' },
      { key: 'coupon:delete', name: 'Remover Cupom' },
    ],
    loyalty: [
      { key: 'loyalty:create', name: 'Criar Recompensa' },
      { key: 'loyalty:read', name: 'Ver Recompensas' },
      { key: 'loyalty:update', name: 'Editar Recompensa' },
      { key: 'loyalty:delete', name: 'Remover Recompensa' },
    ],
    kds: [
      { key: 'kds:read', name: 'Ver KDS' },
      { key: 'kds:update', name: 'Atualizar KDS' },
    ],
    reports: [
      { key: 'report:read', name: 'Ver Relatorios' },
    ],
    delivery_driver: [
      { key: 'delivery_driver:read', name: 'Ver Minhas Entregas' },
      { key: 'delivery_driver:update', name: 'Atualizar Status da Entrega' },
    ],
    // ── Atendimento presencial (mesas + reservas + mapa) ──
    dine_in: [
      { key: 'table:create', name: 'Criar Mesa' },
      { key: 'table:read', name: 'Ver Mesas' },
      { key: 'table:update', name: 'Editar Mesa' },
      { key: 'table:delete', name: 'Remover Mesa' },
      { key: 'reservation:read', name: 'Ver Reservas' },
      { key: 'reservation:update', name: 'Gerenciar Reservas' },
      { key: 'floor_plan:read', name: 'Ver Mapa do Salao' },
      { key: 'floor_plan:update', name: 'Editar Mapa do Salao' },
    ],
    waiter: [
      { key: 'waiter:access', name: 'Acessar App Garcom' },
    ],
  };

  for (const [moduleKey, permissions] of Object.entries(permissionsByModule)) {
    const mod = savedModules[moduleKey];
    for (const perm of permissions) {
      let existing = await permissionRepo.findOne({ where: { key: perm.key } });
      if (!existing) {
        await permissionRepo.save({
          ...perm,
          module_id: mod?.id || null,
        });
      } else if (mod && existing.module_id !== mod.id) {
        // Update module_id for existing permissions that were reorganized
        existing.module_id = mod.id;
        await permissionRepo.save(existing);
      }
    }
  }
  console.log('✅ Default permissions created/updated');

  // Clean up legacy modules that were merged into others
  const legacyModuleKeys = ['roles', 'customization', 'tables', 'reservations', 'floor_plan'];
  for (const legacyKey of legacyModuleKeys) {
    const legacyMod = await moduleRepo.findOne({ where: { key: legacyKey } });
    if (legacyMod) {
      await moduleRepo.remove(legacyMod);
      console.log(`🗑️  Removed legacy module "${legacyKey}" (merged into another module)`);
    }
  }

  // Fetch all permissions for the default admin role
  const allPermissions = await permissionRepo.find();

  // ==========================================
  // DEMO RESTAURANTS
  // ==========================================
  const tenantRepo = dataSource.getRepository('Tenant');
  const categoryRepo = dataSource.getRepository('Category');
  const productRepo = dataSource.getRepository('Product');
  const customerRepo = dataSource.getRepository('Customer');
  const zoneRepo = dataSource.getRepository('DeliveryZone');

  const demoRestaurants = [
    // ── 1. BURGER HOUSE — Plano Basico ──
    {
      tenant: {
        name: 'Burger House',
        slug: 'burger-house',
        primary_color: '#E63946',
        phone: '(11) 98888-1111',
        address: 'Av. dos Hamburgueres, 456 - Sao Paulo, SP',
        description: 'Os melhores burgers artesanais da cidade',
        business_hours: {
          monday: { open: true, openTime: '11:00', closeTime: '23:00' },
          tuesday: { open: true, openTime: '11:00', closeTime: '23:00' },
          wednesday: { open: true, openTime: '11:00', closeTime: '23:00' },
          thursday: { open: true, openTime: '11:00', closeTime: '23:00' },
          friday: { open: true, openTime: '11:00', closeTime: '00:00' },
          saturday: { open: true, openTime: '11:00', closeTime: '00:00' },
          sunday: { open: true, openTime: '12:00', closeTime: '22:00' },
        },
        min_order_value: 30,
        is_active: true,
        order_modes: { delivery: true, pickup: true, dine_in: false },
      },
      planName: 'Basico',
      admin: {
        name: 'Admin Burger House',
        email: 'admin@burgerhouse.com',
      },
      categories: [
        { name: 'Burgers Classicos', description: 'Nossos hamburgueres tradicionais', sort_order: 1 },
        { name: 'Burgers Especiais', description: 'Criacoes do chef', sort_order: 2 },
        { name: 'Acompanhamentos', description: 'Batatas, onion rings e mais', sort_order: 3 },
        { name: 'Bebidas', description: 'Refrigerantes, sucos e shakes', sort_order: 4 },
      ],
      products: [
        { name: 'Classic Burger', description: 'Pao brioche, blend 180g, queijo cheddar, alface, tomate, cebola roxa e molho especial', base_price: 32.90, category: 'Burgers Classicos', sort_order: 1 },
        { name: 'Cheese Bacon', description: 'Pao brioche, blend 180g, queijo cheddar duplo, bacon crocante e molho barbecue', base_price: 38.90, category: 'Burgers Classicos', sort_order: 2 },
        { name: 'Chicken Burger', description: 'Pao brioche, file de frango empanado, queijo prato, alface e maionese', base_price: 29.90, category: 'Burgers Classicos', sort_order: 3 },
        { name: 'Smash Burger Duplo', description: 'Pao potato, dois smash patties 90g, cheddar derretido, cebola caramelizada e pickles', base_price: 42.90, category: 'Burgers Especiais', sort_order: 1 },
        { name: 'Burger Trufado', description: 'Pao brioche, blend wagyu 200g, queijo brie, cogumelos, rucula e maionese trufada', base_price: 54.90, category: 'Burgers Especiais', sort_order: 2 },
        { name: 'BBQ Pulled Pork', description: 'Pao australiano, pulled pork desfiado, coleslaw, cheddar e molho BBQ defumado', base_price: 46.90, category: 'Burgers Especiais', sort_order: 3 },
        { name: 'Batata Frita P', description: 'Porcao individual de batata frita crocante', base_price: 14.90, category: 'Acompanhamentos', sort_order: 1 },
        { name: 'Batata Frita G', description: 'Porcao grande para compartilhar com molho cheddar', base_price: 24.90, category: 'Acompanhamentos', sort_order: 2 },
        { name: 'Onion Rings', description: 'Aneis de cebola empanados e crocantes (12 unidades)', base_price: 19.90, category: 'Acompanhamentos', sort_order: 3 },
        { name: 'Coca-Cola 350ml', description: 'Coca-Cola lata gelada', base_price: 7.90, category: 'Bebidas', sort_order: 1 },
        { name: 'Milkshake Chocolate', description: 'Milkshake cremoso de chocolate belga 500ml', base_price: 22.90, category: 'Bebidas', sort_order: 2 },
        { name: 'Suco Natural Laranja', description: 'Suco de laranja natural 400ml', base_price: 12.90, category: 'Bebidas', sort_order: 3 },
      ],
    },

    // ── 2. PIZZA EXPRESS — Plano Pro ──
    {
      tenant: {
        name: 'Pizza Express',
        slug: 'pizza-express',
        primary_color: '#FF6B35',
        phone: '(11) 99999-0000',
        address: 'Rua das Pizzas, 123 - Sao Paulo, SP',
        description: 'Pizzas artesanais com ingredientes selecionados',
        business_hours: {
          monday: { open: true, openTime: '11:00', closeTime: '23:00' },
          tuesday: { open: true, openTime: '11:00', closeTime: '23:00' },
          wednesday: { open: true, openTime: '11:00', closeTime: '23:00' },
          thursday: { open: true, openTime: '11:00', closeTime: '23:00' },
          friday: { open: true, openTime: '11:00', closeTime: '00:00' },
          saturday: { open: true, openTime: '11:00', closeTime: '00:00' },
          sunday: { open: true, openTime: '11:00', closeTime: '22:00' },
        },
        min_order_value: 25,
        is_active: true,
        order_modes: { delivery: true, pickup: true, dine_in: false },
      },
      planName: 'Pro',
      admin: {
        name: 'Admin Pizza Express',
        email: 'admin@pizzaexpress.com',
      },
      categories: [
        { name: 'Pizzas Tradicionais', description: 'Nossas pizzas classicas', sort_order: 1 },
        { name: 'Pizzas Especiais', description: 'Sabores premium', sort_order: 2 },
        { name: 'Calzones', description: 'Calzones recheados assados no forno', sort_order: 3 },
        { name: 'Bebidas', description: 'Refrigerantes, sucos e cervejas', sort_order: 4 },
        { name: 'Sobremesas', description: 'Doces e sobremesas', sort_order: 5 },
      ],
      products: [
        { name: 'Margherita', description: 'Molho de tomate, mussarela, manjericao fresco e azeite', base_price: 39.90, category: 'Pizzas Tradicionais', sort_order: 1, is_pizza: true },
        { name: 'Calabresa', description: 'Molho de tomate, mussarela, calabresa fatiada e cebola', base_price: 42.90, category: 'Pizzas Tradicionais', sort_order: 2, is_pizza: true },
        { name: 'Portuguesa', description: 'Molho de tomate, mussarela, presunto, ovo, cebola, ervilha e azeitona', base_price: 45.90, category: 'Pizzas Tradicionais', sort_order: 3, is_pizza: true },
        { name: 'Frango com Catupiry', description: 'Molho de tomate, mussarela, frango desfiado e catupiry', base_price: 44.90, category: 'Pizzas Tradicionais', sort_order: 4, is_pizza: true },
        { name: 'Quatro Queijos Premium', description: 'Mussarela, gorgonzola, provolone e parmesao', base_price: 55.90, category: 'Pizzas Especiais', sort_order: 1, is_pizza: true },
        { name: 'Pepperoni Supreme', description: 'Molho de tomate, mussarela, pepperoni importado e pimentao', base_price: 52.90, category: 'Pizzas Especiais', sort_order: 2, is_pizza: true },
        { name: 'Parma com Rucula', description: 'Mussarela, presunto parma, rucula, tomate cereja e parmesao', base_price: 58.90, category: 'Pizzas Especiais', sort_order: 3, is_pizza: true },
        { name: 'Calzone Presunto e Queijo', description: 'Recheio de presunto, mussarela e oregano', base_price: 34.90, category: 'Calzones', sort_order: 1 },
        { name: 'Calzone Calabresa', description: 'Recheio de calabresa, mussarela e cebola', base_price: 36.90, category: 'Calzones', sort_order: 2 },
        { name: 'Coca-Cola 2L', description: 'Refrigerante Coca-Cola 2 litros', base_price: 12.90, category: 'Bebidas', sort_order: 1 },
        { name: 'Guarana Antarctica 2L', description: 'Refrigerante Guarana Antarctica 2 litros', base_price: 10.90, category: 'Bebidas', sort_order: 2 },
        { name: 'Heineken Long Neck', description: 'Cerveja Heineken 330ml', base_price: 9.90, category: 'Bebidas', sort_order: 3 },
        { name: 'Pizza de Chocolate', description: 'Chocolate ao leite, chocolate branco e morango', base_price: 42.90, category: 'Sobremesas', sort_order: 1, is_pizza: true },
        { name: 'Petit Gateau', description: 'Bolo quente de chocolate com sorvete de baunilha', base_price: 24.90, category: 'Sobremesas', sort_order: 2 },
      ],
      deliveryZones: [
        { name: 'Centro e Regiao', fee: 5.0, neighborhoods: ['Centro', 'Boa Vista', 'Republica', 'Se', 'Liberdade', 'Bela Vista'], min_delivery_time: 20, max_delivery_time: 40 },
        { name: 'Zona Sul', fee: 8.0, neighborhoods: ['Vila Mariana', 'Saude', 'Moema', 'Ipiranga', 'Jabaquara', 'Campo Belo'], min_delivery_time: 30, max_delivery_time: 50 },
        { name: 'Zona Oeste', fee: 10.0, neighborhoods: ['Pinheiros', 'Perdizes', 'Lapa', 'Alto de Pinheiros', 'Butanta', 'Vila Madalena'], min_delivery_time: 35, max_delivery_time: 60 },
      ],
    },

    // ── 3. SUSHI PREMIUM — Plano Enterprise ──
    {
      tenant: {
        name: 'Sushi Premium',
        slug: 'sushi-premium',
        primary_color: '#1B4332',
        phone: '(11) 97777-3333',
        address: 'Rua da Liberdade, 789 - Sao Paulo, SP',
        description: 'Culinaria japonesa premium com ingredientes importados',
        business_hours: {
          monday: { open: true, openTime: '11:30', closeTime: '22:30' },
          tuesday: { open: true, openTime: '11:30', closeTime: '22:30' },
          wednesday: { open: true, openTime: '11:30', closeTime: '22:30' },
          thursday: { open: true, openTime: '11:30', closeTime: '22:30' },
          friday: { open: true, openTime: '11:30', closeTime: '23:30' },
          saturday: { open: true, openTime: '11:30', closeTime: '23:30' },
          sunday: { open: true, openTime: '12:00', closeTime: '22:00' },
        },
        min_order_value: 50,
        is_active: true,
        order_modes: { delivery: true, pickup: true, dine_in: true },
      },
      planName: 'Enterprise',
      admin: {
        name: 'Admin Sushi Premium',
        email: 'admin@sushipremium.com',
      },
      categories: [
        { name: 'Combinados', description: 'Combos com variedade de pecas', sort_order: 1 },
        { name: 'Sashimis', description: 'Fatias finas de peixes frescos', sort_order: 2 },
        { name: 'Rolls Especiais', description: 'Rolls autorais do chef', sort_order: 3 },
        { name: 'Hot Rolls', description: 'Rolls empanados e fritos', sort_order: 4 },
        { name: 'Temakis', description: 'Cones de nori recheados', sort_order: 5 },
        { name: 'Pratos Quentes', description: 'Yakisoba, gyoza, tempura e mais', sort_order: 6 },
        { name: 'Bebidas', description: 'Cervejas japonesas, sakes e drinks', sort_order: 7 },
        { name: 'Sobremesas', description: 'Doces japoneses', sort_order: 8 },
      ],
      products: [
        { name: 'Combo Tradicional (20 pecas)', description: '5 sashimis salmao, 5 niguiris, 10 uramakis de salmao', base_price: 69.90, category: 'Combinados', sort_order: 1 },
        { name: 'Combo Premium (30 pecas)', description: '8 sashimis variados, 6 niguiris, 8 uramakis, 8 joy', base_price: 109.90, category: 'Combinados', sort_order: 2 },
        { name: 'Combo Casal (40 pecas)', description: '10 sashimis, 8 niguiris, 12 uramakis, 10 hot rolls', base_price: 149.90, category: 'Combinados', sort_order: 3 },
        { name: 'Sashimi Salmao (10 fatias)', description: 'Fatias generosas de salmao fresco importado', base_price: 45.90, category: 'Sashimis', sort_order: 1 },
        { name: 'Sashimi Atum (10 fatias)', description: 'Fatias de atum bluefin', base_price: 59.90, category: 'Sashimis', sort_order: 2 },
        { name: 'Sashimi Peixe Branco (10 fatias)', description: 'Fatias de peixe branco (robalo) fresco', base_price: 42.90, category: 'Sashimis', sort_order: 3 },
        { name: 'Dragon Roll (8 pecas)', description: 'Roll de camarao empanado coberto com abacate e molho unagi', base_price: 48.90, category: 'Rolls Especiais', sort_order: 1 },
        { name: 'Volcano Roll (8 pecas)', description: 'Roll com salmao, cream cheese, coberto com salmao macaricado', base_price: 52.90, category: 'Rolls Especiais', sort_order: 2 },
        { name: 'Rainbow Roll (8 pecas)', description: 'Roll coberto com fatias de salmao, atum, peixe branco e abacate', base_price: 56.90, category: 'Rolls Especiais', sort_order: 3 },
        { name: 'Hot Philadelphia (10 pecas)', description: 'Salmao e cream cheese empanado e frito', base_price: 36.90, category: 'Hot Rolls', sort_order: 1 },
        { name: 'Hot Skin (10 pecas)', description: 'Pele de salmao crocante com cream cheese', base_price: 32.90, category: 'Hot Rolls', sort_order: 2 },
        { name: 'Temaki Salmao', description: 'Cone de nori com salmao, arroz, cream cheese e cebolinha', base_price: 28.90, category: 'Temakis', sort_order: 1 },
        { name: 'Temaki Camarao Empanado', description: 'Cone de nori com camarao empanado, alface e molho especial', base_price: 32.90, category: 'Temakis', sort_order: 2 },
        { name: 'Yakisoba de Frango', description: 'Macarrao japones salteado com frango, legumes e molho shoyu', base_price: 38.90, category: 'Pratos Quentes', sort_order: 1 },
        { name: 'Gyoza (8 unidades)', description: 'Pasteis japoneses grelhados recheados com carne suina', base_price: 29.90, category: 'Pratos Quentes', sort_order: 2 },
        { name: 'Tempura Misto', description: 'Camarao e legumes empanados em massa leve e crocante', base_price: 44.90, category: 'Pratos Quentes', sort_order: 3 },
        { name: 'Cerveja Asahi 600ml', description: 'Cerveja japonesa premium', base_price: 24.90, category: 'Bebidas', sort_order: 1 },
        { name: 'Sake Quente (180ml)', description: 'Sake japones servido quente', base_price: 18.90, category: 'Bebidas', sort_order: 2 },
        { name: 'Cha Verde Gelado', description: 'Cha verde japones com gelo 500ml', base_price: 12.90, category: 'Bebidas', sort_order: 3 },
        { name: 'Mochi Ice (3 un)', description: 'Bolinho de arroz japones recheado com sorvete (morango, manga, matcha)', base_price: 22.90, category: 'Sobremesas', sort_order: 1 },
        { name: 'Harumaki de Chocolate (4 un)', description: 'Rolinho primavera de chocolate ao leite com sorvete', base_price: 19.90, category: 'Sobremesas', sort_order: 2 },
      ],
      deliveryZones: [
        { name: 'Liberdade e Centro', fee: 0, neighborhoods: ['Liberdade', 'Bela Vista', 'Se', 'Republica', 'Centro'], min_delivery_time: 15, max_delivery_time: 30 },
        { name: 'Zona Sul', fee: 8.0, neighborhoods: ['Vila Mariana', 'Saude', 'Moema', 'Aclimacao', 'Paraiso', 'Campo Belo'], min_delivery_time: 25, max_delivery_time: 45 },
        { name: 'Zona Oeste', fee: 10.0, neighborhoods: ['Pinheiros', 'Jardins', 'Cerqueira Cesar', 'Consolacao', 'Itaim Bibi', 'Vila Olimpia'], min_delivery_time: 25, max_delivery_time: 45 },
        { name: 'Zona Norte', fee: 12.0, neighborhoods: ['Santana', 'Tucuruvi', 'Casa Verde', 'Vila Guilherme'], min_delivery_time: 35, max_delivery_time: 60 },
        { name: 'Zona Leste', fee: 15.0, neighborhoods: ['Tatuape', 'Mooca', 'Vila Prudente', 'Analia Franco', 'Penha'], min_delivery_time: 40, max_delivery_time: 70 },
      ],
    },
  ];

  for (const demo of demoRestaurants) {
    // ── Create or update tenant ──
    let tenant = await tenantRepo.findOne({ where: { slug: demo.tenant.slug } });
    const plan = savedPlans[demo.planName];

    if (!tenant) {
      tenant = await tenantRepo.save({
        ...demo.tenant,
        plan_id: plan?.id || null,
      });
      console.log(`✅ Tenant "${demo.tenant.name}" created (${demo.planName})`);
    } else {
      // Update plan if different
      if (tenant.plan_id !== plan?.id) {
        await tenantRepo.update(tenant.id, { plan_id: plan?.id || null });
        tenant.plan_id = plan?.id || null;
        console.log(`🔄 Tenant "${demo.tenant.name}" updated to plan ${demo.planName}`);
      } else {
        console.log(`⏭️  Tenant "${demo.tenant.name}" already exists (${demo.planName})`);
      }
    }

    const tenantId = (tenant as any).id;

    // ── Create default "Administrador" role with ALL permissions ──
    const roleRepo = dataSource.getRepository('Role');
    let adminRole = await roleRepo.findOne({ where: { name: 'Administrador', tenant_id: tenantId }, relations: ['permissions'] });
    if (!adminRole) {
      adminRole = await roleRepo.save({
        name: 'Administrador',
        description: 'Acesso completo a todas as funcionalidades',
        tenant_id: tenantId,
        permissions: allPermissions,
      });
      console.log(`  ✅ Role "Administrador" created with ${allPermissions.length} permissions`);
    } else {
      // Update permissions to include any new ones
      const existingKeys = new Set(((adminRole as any).permissions || []).map((p: any) => p.key));
      const missing = allPermissions.filter((p: any) => !existingKeys.has(p.key));
      if (missing.length > 0) {
        (adminRole as any).permissions = [...((adminRole as any).permissions || []), ...missing];
        await roleRepo.save(adminRole);
        console.log(`  🔄 Role "Administrador" updated with ${missing.length} new permissions (total: ${allPermissions.length})`);
      } else {
        console.log(`  ⏭️  Role "Administrador" already up to date (${allPermissions.length} permissions)`);
      }
    }

    // ── Create default "Garcom" role with waiter permissions ──
    const waiterPermKeys = [
      'order:create', 'order:read', 'order:update',
      'table:read', 'table:update',
      'product:read', 'category:read',
      'waiter:access',
    ];
    const waiterPerms = allPermissions.filter((p: any) => waiterPermKeys.includes(p.key));
    let waiterRole = await roleRepo.findOne({ where: { name: 'Garcom', tenant_id: tenantId }, relations: ['permissions'] });
    if (!waiterRole) {
      waiterRole = await roleRepo.save({
        name: 'Garcom',
        description: 'Acesso ao app do garcom para pedidos presenciais',
        tenant_id: tenantId,
        permissions: waiterPerms,
      });
      console.log(`  ✅ Role "Garcom" created with ${waiterPerms.length} permissions`);
    } else {
      const existingKeys = new Set(((waiterRole as any).permissions || []).map((p: any) => p.key));
      const missing = waiterPerms.filter((p: any) => !existingKeys.has(p.key));
      if (missing.length > 0) {
        (waiterRole as any).permissions = [...((waiterRole as any).permissions || []), ...missing];
        await roleRepo.save(waiterRole);
        console.log(`  🔄 Role "Garcom" updated with ${missing.length} new permissions`);
      } else {
        console.log(`  ⏭️  Role "Garcom" already up to date`);
      }
    }

    // ── Create admin user ──
    let admin = await userRepo.findOne({ where: { email: demo.admin.email } });
    if (!admin) {
      admin = await userRepo.save({
        name: demo.admin.name,
        email: demo.admin.email,
        password_hash: passwordHash,
        system_role: UserRole.ADMIN,
        tenant_id: tenantId,
        role_id: (adminRole as any).id,
        is_active: true,
      });
      console.log(`  ✅ Admin "${demo.admin.email}" created with role "Administrador"`);
    } else {
      // Ensure existing admin has the correct role assigned
      if ((admin as any).role_id !== (adminRole as any).id) {
        await userRepo.update((admin as any).id, { role_id: (adminRole as any).id });
        console.log(`  🔄 Admin "${demo.admin.email}" assigned role "Administrador"`);
      } else {
        console.log(`  ⏭️  Admin "${demo.admin.email}" already exists with correct role`);
      }
    }

    // ── Create default customer ──
    let defaultCustomer = await customerRepo.findOne({
      where: { phone: '0000000000', tenant_id: tenantId },
    });
    if (!defaultCustomer) {
      await customerRepo.save({
        name: 'Consumidor Final',
        phone: '0000000000',
        tenant_id: tenantId,
      });
    }

    // ── Create categories ──
    const existingCategories = await categoryRepo.find({ where: { tenant_id: tenantId } });
    if (existingCategories.length === 0 && demo.categories) {
      for (const cat of demo.categories) {
        await categoryRepo.save({
          ...cat,
          tenant_id: tenantId,
          is_active: true,
        });
      }
      console.log(`  ✅ ${demo.categories.length} categories created`);
    } else {
      console.log(`  ⏭️  Categories already exist (${existingCategories.length})`);
    }

    // ── Create products ──
    const existingProducts = await productRepo.find({ where: { tenant_id: tenantId } });
    if (existingProducts.length === 0 && demo.products) {
      const cats = await categoryRepo.find({ where: { tenant_id: tenantId } });
      for (const prod of demo.products) {
        const cat = cats.find((c: any) => c.name === prod.category);
        if (cat) {
          await productRepo.save({
            name: prod.name,
            description: prod.description,
            base_price: prod.base_price,
            is_pizza: (prod as any).is_pizza || false,
            category_id: (cat as any).id,
            tenant_id: tenantId,
            sort_order: prod.sort_order,
          });
        }
      }
      console.log(`  ✅ ${demo.products.length} products created`);
    } else {
      console.log(`  ⏭️  Products already exist (${existingProducts.length})`);
    }

    // ── Create delivery zones (if plan includes delivery) ──
    if ((demo as any).deliveryZones) {
      const existingZones = await zoneRepo.find({ where: { tenant_id: tenantId } });
      if (existingZones.length === 0) {
        for (const zone of (demo as any).deliveryZones) {
          await zoneRepo.save({
            name: zone.name,
            fee: zone.fee,
            neighborhoods: zone.neighborhoods,
            polygon: [],
            min_delivery_time: zone.min_delivery_time,
            max_delivery_time: zone.max_delivery_time,
            tenant_id: tenantId,
          });
        }
        console.log(`  ✅ ${(demo as any).deliveryZones.length} delivery zones created`);
      } else {
        console.log(`  ⏭️  Delivery zones already exist (${existingZones.length})`);
      }
    }

    // ── Create demo tables for Enterprise tenant (Sushi Premium) ──
    if (demo.tenant.slug === 'sushi-premium') {
      const tableRepo = dataSource.getRepository('RestaurantTable');
      const existingTables = await tableRepo.find({ where: { tenant_id: tenantId } });
      if (existingTables.length === 0) {
        const tables = [
          { number: 1, label: 'Salao A', capacity: 2, tenant_id: tenantId },
          { number: 2, label: 'Salao A', capacity: 4, tenant_id: tenantId },
          { number: 3, label: 'Salao A', capacity: 4, tenant_id: tenantId },
          { number: 4, label: 'Salao A', capacity: 6, tenant_id: tenantId },
          { number: 5, label: 'Varanda', capacity: 2, tenant_id: tenantId },
          { number: 6, label: 'Varanda', capacity: 4, tenant_id: tenantId },
          { number: 7, label: 'Reservado', capacity: 8, tenant_id: tenantId },
          { number: 8, label: 'Bar', capacity: 2, tenant_id: tenantId },
        ];
        for (const t of tables) {
          await tableRepo.save(t);
        }
        console.log(`  ✅ 8 tables created for Sushi Premium`);
      } else {
        console.log(`  ⏭️  Tables already exist (${existingTables.length})`);
      }

      // ── Create demo waiter user ──
      let waiterUser = await userRepo.findOne({ where: { email: 'garcom@sushipremium.com' } });
      if (!waiterUser) {
        waiterUser = await userRepo.save({
          name: 'Garcom Demo',
          email: 'garcom@sushipremium.com',
          password_hash: passwordHash,
          system_role: UserRole.WAITER,
          tenant_id: tenantId,
          role_id: (waiterRole as any).id,
          is_active: true,
        });
        console.log(`  ✅ Waiter "garcom@sushipremium.com" created (senha: admin123)`);
      } else {
        if ((waiterUser as any).role_id !== (waiterRole as any).id) {
          await userRepo.update((waiterUser as any).id, { role_id: (waiterRole as any).id });
          console.log(`  🔄 Waiter "garcom@sushipremium.com" assigned role "Garcom"`);
        } else {
          console.log(`  ⏭️  Waiter "garcom@sushipremium.com" already exists`);
        }
      }
    }
  }

  await dataSource.destroy();
  console.log('🌱 Seed completed!');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
