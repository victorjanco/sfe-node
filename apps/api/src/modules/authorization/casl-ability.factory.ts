import { Injectable } from '@nestjs/common';
import { AbilityBuilder, createMongoAbility, MongoAbility, ExtractSubjectType } from '@casl/ability';
import { Action } from './enums/action.enum';
export type Subjects = string;

export type AppAbility = MongoAbility<[Action, Subjects]>;

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: {
    id: number;
    username: string;
    roles: string[];
    permissions: string[];
  }): AppAbility {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    if (user.permissions.includes('system.full_access')) {
      can(Action.Manage, 'all');
      return build({
        detectSubjectType: (item: object) => item.constructor.name as ExtractSubjectType<Subjects>,
      });
    }

    for (const permission of user.permissions) {
      const parts = permission.split('.');
      const module = parts[0];
      const action = parts.slice(1).join('.') || parts[0];
      if (module && action) {
        const caslAction = this.mapAction(action);
        const subject = this.mapSubject(module, action);
        can(caslAction, subject);
      }
    }

    if (
      user.permissions.includes('reports.read') ||
      user.permissions.includes('reports.export')
    ) {
      can(Action.Read, 'Sale');
      can(Action.Read, 'Invoice');
      can(Action.Read, 'NoteSale');
    }

    return build({
      detectSubjectType: (item: object) => item.constructor.name as ExtractSubjectType<Subjects>,
    });
  }

  private mapAction(action: string): Action {
    const actionMap: Record<string, Action> = {
      create: Action.Create,
      read: Action.Read,
      update: Action.Update,
      delete: Action.Delete,
      full_access: Action.Manage,
      manage: Action.Manage,
      export: Action.Read,
      stock: Action.Read,
      kardex: Action.Read,
      balance: Action.Read,
      inventory_entry: Action.Create,
      inventory_exit: Action.Create,
      inventory_product: Action.Read,
      inventory_warehouse: Action.Manage,
      inventory_kardex: Action.Read,
      inventory_balance: Action.Read,
      'note_sales.read': Action.Read,
      'note_sales.manage': Action.Manage,
    };
    return actionMap[action] || Action.Read;
  }

  private mapSubject(module: string, action?: string): string {
    if (module === 'reports') {
      const reportSubjects: Record<string, string> = {
        stock: 'InventoryStock',
        kardex: 'InventoryKardex',
        balance: 'InventoryBalance',
      };
      if (action && reportSubjects[action]) return reportSubjects[action];
      return 'Report';
    }

    const subjectMap: Record<string, string> = {
      users: 'User',
      roles: 'Role',
      permissions: 'Permission',
      sales: 'Sale',
      note_sales: 'NoteSale',
      inventory: 'Inventory',
      inventory_entries: 'InventoryEntry',
      inventory_exits: 'InventoryExit',
      inventory_entry: 'Inventory',
      inventory_exit: 'Inventory',
      inventory_product: 'Inventory',
      inventory_warehouse: 'Inventory',
      inventory_kardex: 'Inventory',
      inventory_balance: 'Inventory',
      warehouses: 'Warehouse',
      warehouse: 'Warehouse',
      reports: 'Report',
      system: 'all',
      siat: 'Siat',
      company: 'Company',
      branch_office: 'BranchOffice',
      point_sale: 'PointSale',
      token: 'Company',
      customer: 'Customer',
      product: 'Product',
      catalog: 'Catalog',
      facturas: 'Invoice',
    };
    return subjectMap[module] || module;
  }
}