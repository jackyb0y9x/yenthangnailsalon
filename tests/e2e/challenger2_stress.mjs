/**
 * Challenger 2 Empirical Adversarial Stress Harness (Milestone 4)
 * Zero-dependency Node.js execution wrapper using OpaqueTestClient
 * 
 * Verifies:
 * 1. Operational RBAC boundaries and privilege escalation prevention
 * 2. Consultation inquiry status workflows & 1-click customer profile creation
 * 3. Staff productivity calculations with zero-state, multi-visit, and deactivation retention
 */

import { OpaqueTestClient, stopEmbeddedServer } from './infra/client.ts';
import { expect } from './infra/assertions.ts';

console.log('================================================================================');
console.log('🧪 RUNNING CHALLENGER 2 EMPIRICAL ADVERSARIAL STRESS HARNESS');
console.log('================================================================================');

let passedAssertions = 0;
let totalAssertions = 0;

function assert(condition, message) {
  totalAssertions++;
  if (!condition) {
    console.error(`\x1b[31mFAIL:\x1b[0m ${message}`);
    throw new Error(`CHALLENGER 2 ASSERTION FAILED: ${message}`);
  }
  passedAssertions++;
}

async function run() {
  try {
    // ============================================================================
    // Area 1: Operational RBAC Boundaries & Privilege Escalation Prevention
    // ============================================================================
    console.log('\n[1/3] Empirical Stress-Testing RBAC Boundaries & Privilege Escalation...');

    // 1.1 Unauthenticated requests to /api/admin/staff/* must return 401 Unauthorized
    const anonClient = new OpaqueTestClient();

    const unauthEndpoints = [
      { method: 'GET', url: '/api/admin/staff' },
      { method: 'POST', url: '/api/admin/staff', body: { full_name: 'Ghost Admin' } },
      { method: 'GET', url: '/api/admin/staff/stf-001' },
      { method: 'PUT', url: '/api/admin/staff/stf-001', body: { full_name: 'Renamed' } },
      { method: 'PUT', url: '/api/admin/staff/stf-003/role', body: { role: 'super_admin' } },
      { method: 'PUT', url: '/api/admin/staff/stf-003/status', body: { is_active: false } },
      { method: 'PUT', url: '/api/admin/staff/stf-003/specializations', body: { specializations: ['SNS'] } },
      { method: 'GET', url: '/api/admin/staff/stf-003/productivity' },
    ];

    for (const ep of unauthEndpoints) {
      let res;
      if (ep.method === 'GET') res = await anonClient.get(ep.url);
      else if (ep.method === 'POST') res = await anonClient.post(ep.url, ep.body);
      else if (ep.method === 'PUT') res = await anonClient.put(ep.url, ep.body);

      assert(res.status === 401, `Unauthenticated ${ep.method} ${ep.url} expected 401, got ${res.status}`);
      assert(res.json().error.includes('Unauthorized'), `Error response must indicate Unauthorized for ${ep.url}`);
    }
    console.log(`  ✔ Tested 8 staff endpoints without session: All strictly return HTTP 401 Unauthorized`);

    // 1.2 Staff role users attempting restricted actions return HTTP 403 Forbidden
    const staffClient = new OpaqueTestClient();
    await staffClient.loginAs('staff');

    // Attempt staff creation
    const resCreate = await staffClient.post('/api/admin/staff', {
      full_name: 'Technician Hired Rogue',
      phone: '0412 000 999',
      role: 'staff',
    });
    assert(resCreate.status === 403, `Staff creating staff expected 403, got ${resCreate.status}`);
    assert(resCreate.json().error.includes('Forbidden'), `Expected Forbidden error message, got: ${resCreate.json().error}`);

    // Attempt role modification
    const resRoleStaff = await staffClient.put('/api/admin/staff/stf-003/role', {
      role: 'super_admin',
    });
    assert(resRoleStaff.status === 403, `Staff elevating role expected 403, got ${resRoleStaff.status}`);
    console.log(`  ✔ Tested staff role user boundaries: Staff creation and role updates strictly return HTTP 403 Forbidden`);

    // 1.3 Manager role CANNOT elevate to super_admin (HTTP 403 Forbidden)
    const managerClient = new OpaqueTestClient();
    await managerClient.loginAs('manager');

    // Manager elevating another user to super_admin
    const resManagerElevateOther = await managerClient.put('/api/admin/staff/stf-003/role', {
      role: 'super_admin',
    });
    assert(resManagerElevateOther.status === 403, `Manager elevating staff to super_admin expected 403, got ${resManagerElevateOther.status}`);
    assert(resManagerElevateOther.json().error.includes('Only super_admin'), 'Manager elevation error must cite super_admin requirement');

    // Manager elevating self (stf-002) to super_admin
    const resManagerElevateSelf = await managerClient.put('/api/admin/staff/stf-002/role', {
      role: 'super_admin',
    });
    assert(resManagerElevateSelf.status === 403, `Manager elevating self to super_admin expected 403, got ${resManagerElevateSelf.status}`);
    console.log(`  ✔ Tested manager role limits: Elevation of self or others to super_admin strictly returns HTTP 403 Forbidden`);

    // 1.4 Only super_admin can grant super_admin
    const adminClient = new OpaqueTestClient();
    await adminClient.loginAs('super_admin');

    const resAdminGrant = await adminClient.put('/api/admin/staff/stf-003/role', {
      role: 'super_admin',
    });
    assert(resAdminGrant.status === 200, `Super admin granting role expected 200, got ${resAdminGrant.status}`);
    assert(resAdminGrant.json().staff.role === 'super_admin', 'Role was not updated to super_admin');

    // Revert role
    await adminClient.put('/api/admin/staff/stf-003/role', { role: 'staff' });
    console.log(`  ✔ Tested super_admin role authority: Successfully granted super_admin role with HTTP 200`);

    // ============================================================================
    // Area 2: Consultation Inquiry Status Transition Workflows & Conversions
    // ============================================================================
    console.log('\n[2/3] Empirical Stress-Testing Consultation Inquiry Status & Conversions...');

    // 2.1 First create a live consultation via public endpoint
    const publicClient = new OpaqueTestClient();
    const newInquiryRes = await publicClient.post('/api/consultation', {
      customer_name: 'Minh Trang Trần',
      phone: '0488 222 333',
      email: 'minhtrang@adverstest.com.au',
      preferred_language: 'vi',
      preferred_date: '2026-11-28',
      preferred_time: '14:00',
      services_requested: ['Russian Manicure', '3D Nail Art'],
      notes: 'Customer allergy warning: sensitive cuticles',
    });
    assert(newInquiryRes.status === 201, `Failed to submit consultation form: ${newInquiryRes.status}`);
    const createdInqId = newInquiryRes.json().inquiry_id;

    // Full transition path: new -> contacted -> booked -> completed -> cancelled
    const statusSequence = ['contacted', 'booked', 'completed', 'cancelled'];

    for (const nextStatus of statusSequence) {
      const resStatus = await managerClient.put(`/api/admin/inquiries/${createdInqId}`, {
        status: nextStatus,
        notes: `Step to ${nextStatus}`,
      });
      assert(resStatus.status === 200, `Expected 200 transitioning to ${nextStatus}, got ${resStatus.status}`);
      assert(resStatus.json().inquiry.status === nextStatus, `Inquiry status mismatch: expected ${nextStatus}`);
    }
    console.log('  ✔ Tested complete status transition path (new -> contacted -> booked -> completed -> cancelled)');

    // 2.2 1-Click Customer Profile Creation & Field Verification
    // Create another fresh inquiry to test conversion
    const inqForConvertRes = await publicClient.post('/api/consultation', {
      customer_name: 'Linh Chi Hoàng',
      phone: '0477 999 888',
      email: 'linhchi@glamournails.test',
      preferred_language: 'vi',
      preferred_date: '2026-11-30',
      preferred_time: '11:00',
      services_requested: ['Acrylic Extensions'],
      notes: 'Allergy alert: acetone sensitivity and latex allergy',
    });
    assert(inqForConvertRes.status === 201, 'Failed to create inquiry for conversion');
    const convertInqId = inqForConvertRes.json().inquiry_id;

    // Convert via 1-click
    const resConvert = await managerClient.put(`/api/admin/inquiries/${convertInqId}`, {
      status: 'booked',
      convert_to_customer: true,
    });
    assert(resConvert.status === 200, `Expected 200 on conversion, got ${resConvert.status}`);
    const convertedCustomerId = resConvert.json().inquiry.converted_customer_id;
    assert(typeof convertedCustomerId === 'string', 'converted_customer_id was not populated');

    // Query customer list to verify customer details
    const resCustomers = await managerClient.get('/api/admin/customers');
    assert(resCustomers.status === 200, 'Failed to fetch customer list');
    const custList = resCustomers.json().customers || [];
    const custProfile = custList.find((c) => c.id === convertedCustomerId || c.phone === '0477 999 888');
    assert(custProfile !== undefined, 'Customer profile was not found in customer list');
    assert(custProfile.name === 'Linh Chi Hoàng', `Customer name mismatch: got ${custProfile.name}`);
    assert(custProfile.phone === '0477 999 888', `Customer phone mismatch: got ${custProfile.phone}`);
    assert(custProfile.email === 'linhchi@glamournails.test', `Customer email mismatch: got ${custProfile.email}`);
    assert(custProfile.allergies.includes('acetone sensitivity') || custProfile.allergies.includes('allergy'), 'Customer profile missing allergy extraction');
    console.log('  ✔ Tested 1-click customer creation: Profile created with name, phone, email, allergy notes, and linked converted_customer_id');

    // 2.3 Duplicate Conversions & Idempotency
    const customerCountBeforeDupe = custList.length;
    for (let i = 0; i < 5; i++) {
      const resDupe = await managerClient.put(`/api/admin/inquiries/${convertInqId}`, {
        status: 'booked',
        convert_to_customer: true,
      });
      assert(resDupe.status === 200, `Dupe conversion iteration ${i} failed`);
      assert(resDupe.json().inquiry.converted_customer_id === convertedCustomerId, `Converted ID mutated on iteration ${i}`);
    }

    const resCustomersAfter = await managerClient.get('/api/admin/customers');
    const countAfter = resCustomersAfter.json().customers.length;
    assert(countAfter === customerCountBeforeDupe, `Duplicate conversions created duplicate records! ${customerCountBeforeDupe} -> ${countAfter}`);
    console.log('  ✔ Tested duplicate conversions idempotency: Exactly 1 customer record maintained');

    // ============================================================================
    // Area 3: Staff Productivity Calculation Robustness
    // ============================================================================
    console.log('\n[3/3] Empirical Stress-Testing Staff Productivity Calculations...');

    // 3.1 Staff with 0 visits: returns 0 visits, 0 revenue, 0 avg ticket without dividing by zero
    const resNewStaff = await adminClient.post('/api/admin/staff', {
      full_name: 'Fresh Stylist Zero Visits',
      phone: '0411 888 777',
      role: 'staff',
      employment_type: 'Casual',
    });
    assert(resNewStaff.status === 201, 'Failed to create zero-visit staff member');
    const zeroStaffId = resNewStaff.json().staff_id;

    const resZeroProd = await managerClient.get(`/api/admin/staff/${zeroStaffId}/productivity`);
    assert(resZeroProd.status === 200, `Expected 200 for zero-visit productivity, got ${resZeroProd.status}`);
    const zeroData = resZeroProd.json();
    assert(zeroData.completed_visits === 0, `Expected 0 visits, got ${zeroData.completed_visits}`);
    assert(zeroData.total_revenue_cents === 0, `Expected 0 revenue cents, got ${zeroData.total_revenue_cents}`);
    assert(zeroData.total_revenue_aud === 0, `Expected 0 revenue AUD, got ${zeroData.total_revenue_aud}`);
    assert(zeroData.average_ticket_aud === 0, `Expected 0 avg ticket, got ${zeroData.average_ticket_aud}`);
    assert(!Number.isNaN(zeroData.average_ticket_aud), 'Average ticket returned NaN!');
    assert(Number.isFinite(zeroData.average_ticket_aud), 'Average ticket returned non-finite number!');
    console.log('  ✔ Tested zero-visit staff member: 0 completed visits, $0.00 revenue, $0.00 average ticket (safe division)');

    // 3.2 Productivity with multiple service visits and varied prices
    const multiStaffRes = await adminClient.post('/api/admin/staff', {
      full_name: 'Productive Stylist Multi',
      phone: '0412 555 444',
      role: 'staff',
      employment_type: 'Full-time',
    });
    const multiStaffId = multiStaffRes.json().staff_id;

    const variedPrices = [
      { cents: 3500, aud: 35.0, name: 'Express Manicure' },
      { cents: 7550, aud: 75.5, name: 'SNS Dipping' },
      { cents: 12000, aud: 120.0, name: 'Acrylic Full Set' },
      { cents: 24500, aud: 245.0, name: 'Deluxe Spa Treatment' },
    ];

    let expectedCents = 0;
    for (const vp of variedPrices) {
      expectedCents += vp.cents;
      const resVisit = await managerClient.post('/api/admin/visits', {
        customer_id: convertedCustomerId,
        staff_id: multiStaffId,
        visit_date: '2026-11-16T12:00:00Z',
        services_rendered: [{ name: vp.name, price_cents: vp.cents }],
        total_amount_cents: vp.cents,
        payment_method: 'EFTPOS',
      });
      assert(resVisit.status === 201, `Failed to record visit with price ${vp.cents}`);
    }

    const resMultiProd = await managerClient.get(`/api/admin/staff/${multiStaffId}/productivity`);
    assert(resMultiProd.status === 200, 'Failed to fetch productivity for multi-visit staff');
    const multiData = resMultiProd.json();
    assert(multiData.completed_visits === variedPrices.length, `Expected ${variedPrices.length} visits, got ${multiData.completed_visits}`);
    assert(multiData.total_revenue_cents === expectedCents, `Expected ${expectedCents} cents, got ${multiData.total_revenue_cents}`);
    assert(multiData.total_revenue_aud === expectedCents / 100, `Expected ${expectedCents / 100} AUD, got ${multiData.total_revenue_aud}`);
    const expectedAvg = (expectedCents / 100) / variedPrices.length;
    assert(Math.abs(multiData.average_ticket_aud - expectedAvg) < 0.01, `Expected avg ticket ${expectedAvg}, got ${multiData.average_ticket_aud}`);
    console.log(`  ✔ Tested multi-visit staff productivity: ${variedPrices.length} visits, $${(expectedCents / 100).toFixed(2)} AUD total, $${expectedAvg.toFixed(2)} AUD avg ticket`);

    // 3.3 Deactivating staff member (is_active: false) retains completed visits and historical revenue
    const resDeact = await adminClient.put(`/api/admin/staff/${multiStaffId}/status`, {
      is_active: false,
    });
    assert(resDeact.status === 200, 'Failed to deactivate staff member');
    assert(resDeact.json().staff.is_active === false, 'Staff is_active was not false');

    // Excluded from active roster
    const resActiveOnly = await managerClient.get('/api/admin/staff?active=true');
    const activeStaff = resActiveOnly.json().staff || [];
    assert(!activeStaff.some((s) => s.id === multiStaffId), 'Deactivated staff appeared in active-only list!');

    // Retained in all staff directory
    const resAll = await managerClient.get('/api/admin/staff');
    const allStaff = resAll.json().staff || [];
    const deactProfile = allStaff.find((s) => s.id === multiStaffId);
    assert(deactProfile !== undefined, 'Deactivated staff missing from directory!');
    assert(deactProfile.is_active === false, 'Staff is_active is not false in directory');

    // Productivity query for deactivated staff strictly retains visits and revenue
    const resDeactProd = await managerClient.get(`/api/admin/staff/${multiStaffId}/productivity`);
    assert(resDeactProd.status === 200, `Productivity for deactivated staff failed with status ${resDeactProd.status}`);
    const deactProdData = resDeactProd.json();
    assert(deactProdData.completed_visits === multiData.completed_visits, 'Completed visits count changed after deactivation!');
    assert(deactProdData.total_revenue_cents === multiData.total_revenue_cents, 'Revenue cents changed after deactivation!');
    assert(deactProdData.total_revenue_aud === multiData.total_revenue_aud, 'Revenue AUD changed after deactivation!');
    assert(deactProdData.average_ticket_aud === multiData.average_ticket_aud, 'Average ticket changed after deactivation!');
    console.log('  ✔ Tested staff deactivation: Roster filtering and historical productivity strictly retained');

    console.log('================================================================================');
    console.log(`✅ CHALLENGER 2 STRESS HARNESS PASSED: ${passedAssertions}/${totalAssertions} assertions passed`);
    console.log('================================================================================');

    await stopEmbeddedServer();
    process.exit(0);
  } catch (err) {
    console.error(`\x1b[31mFatal error during Challenger 2 test harness:\x1b[0m`, err);
    await stopEmbeddedServer();
    process.exit(1);
  }
}

run();
