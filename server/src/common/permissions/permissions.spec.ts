import {
  ALL_PERMISSIONS,
  ROLE_PRESETS,
  can,
  canDeleteOrders,
  permissionsOf,
} from './permissions';

describe('permissions', () => {
  const staff = (permissions: string[]) => ({
    role: 'STAFF' as const,
    permissions,
  });

  it('admins and super admins may do everything', () => {
    expect(can({ role: 'ADMIN', permissions: [] }, 'staff.manage')).toBe(true);
    expect(can({ role: 'SUPER_ADMIN' }, 'settings.manage')).toBe(true);
    expect(permissionsOf({ role: 'ADMIN' })).toEqual(ALL_PERMISSIONS);
  });

  it('staff may do only what they hold; any one of several is enough', () => {
    expect(can(staff(['orders.view']), 'orders.view')).toBe(true);
    expect(can(staff(['orders.view']), 'orders.manage')).toBe(false);
    expect(
      can(staff(['orders.assign']), 'delivery.manage', 'orders.assign'),
    ).toBe(true);
  });

  it('an empty list means "any signed-in staff" for staff, never for customers', () => {
    expect(can(staff([]))).toBe(true);
    expect(can({ role: 'USER', permissions: [] })).toBe(false);
    expect(
      can({ role: 'USER', permissions: ['orders.view'] }, 'orders.view'),
    ).toBe(false);
  });

  it('ignores permission names that do not exist', () => {
    expect(permissionsOf(staff(['orders.view', 'made.up']))).toEqual([
      'orders.view',
    ]);
  });

  it('every preset only uses real permissions', () => {
    for (const p of Object.values(ROLE_PRESETS))
      expect(p.permissions.every((x) => ALL_PERMISSIONS.includes(x))).toBe(
        true,
      );
  });

  it('the rider preset can deliver but may not see orders in the dashboard', () => {
    expect(ROLE_PRESETS.rider).toMatchObject({
      role: 'STAFF',
      canDeliver: true,
      permissions: [],
    });
  });

  describe('canDeleteOrders', () => {
    it('allows superadmin and admin to delete orders', () => {
      expect(canDeleteOrders({ role: 'SUPER_ADMIN' })).toBe(true);
      expect(canDeleteOrders({ role: 'ADMIN' })).toBe(true);
    });

    it('allows managers to delete orders by staffTitle', () => {
      expect(canDeleteOrders({ role: 'STAFF', staffTitle: 'Manager' })).toBe(true);
      expect(canDeleteOrders({ role: 'STAFF', staffTitle: 'Store Manager' })).toBe(true);
      expect(canDeleteOrders({ role: 'STAFF', staffTitle: 'Branch Manager' })).toBe(true);
    });

    it('blocks delivery riders, general staff, and customers from deleting orders', () => {
      expect(canDeleteOrders({ role: 'USER' })).toBe(false);
      expect(canDeleteOrders({ role: 'STAFF', staffTitle: 'Rider', canDeliver: true })).toBe(false);
      expect(canDeleteOrders({ role: 'STAFF', staffTitle: 'Delivery Staff', canDeliver: true })).toBe(false);
      expect(canDeleteOrders({ role: 'STAFF', staffTitle: 'Manager', canDeliver: true })).toBe(false);
      expect(canDeleteOrders(staff(['orders.view', 'orders.manage']))).toBe(false);
      expect(canDeleteOrders({ role: 'STAFF', staffTitle: 'Packer' })).toBe(false);
    });
  });
});
