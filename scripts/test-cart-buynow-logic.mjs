console.log('================================================================');
console.log('🧪 VERIFYING CART DRAWER & BUY NOW ISOLATION LOGIC');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failCount++;
  }
}

// 1. Mock LocalStorage / SessionStorage Isolation
const mockLocalStorage = new Map();
const mockSessionStorage = new Map();

function getCartItems() {
  const data = mockLocalStorage.get('arh_cart_items');
  return data ? JSON.parse(data) : [];
}

function saveCartItems(items) {
  mockLocalStorage.set('arh_cart_items', JSON.stringify(items));
}

function getBuyNowItem() {
  const data = mockSessionStorage.get('arh_buynow_item');
  return data ? JSON.parse(data) : null;
}

function saveBuyNowItem(item) {
  if (item) {
    mockSessionStorage.set('arh_buynow_item', JSON.stringify(item));
  } else {
    mockSessionStorage.delete('arh_buynow_item');
  }
}

// Step 1: Add Item A to regular cart (Qty: 2)
console.log('--- 1. Testing Regular Cart Addition ---');
const itemA = {
  id: 'item-A',
  productId: 'prod-1',
  productName: 'Combed Cotton Vest',
  unitPrice: 500,
  quantity: 2,
};
saveCartItems([itemA]);
assert(getCartItems().length === 1, 'Regular cart has 1 item type');
assert(getCartItems()[0].quantity === 2, 'Regular cart Item A quantity is 2');

// Step 2: Trigger Buy Now on Item B (Qty: 3)
console.log('\n--- 2. Triggering Buy Now on Item B (Qty: 3) ---');
const itemB = {
  id: 'item-B',
  productId: 'prod-2',
  productName: 'Super Soft Boxer',
  unitPrice: 650,
  quantity: 3,
};
saveBuyNowItem(itemB);

// Assert Buy Now state is isolated
assert(getBuyNowItem() !== null, 'Buy Now item set in isolated session storage');
assert(getBuyNowItem().productId === 'prod-2', 'Buy Now product is prod-2');
assert(getBuyNowItem().quantity === 3, 'Buy Now quantity is strictly 3');

// Assert Regular cart was NOT polluted or mutated
assert(getCartItems().length === 1, 'Regular cart still has exactly 1 item (no bleeding)');
assert(getCartItems()[0].productId === 'prod-1', 'Regular cart item is still prod-1');
assert(getCartItems()[0].quantity === 2, 'Regular cart quantity is still 2 (not merged or overwritten)');

// Step 3: Simulate Checkout with isBuyNow = true
console.log('\n--- 3. Simulating Checkout Resolution ---');
function resolveCheckoutItems(isBuyNowParam) {
  const buyNow = getBuyNowItem();
  const cart = getCartItems();
  const isBuyNow = isBuyNowParam && Boolean(buyNow);
  const items = isBuyNow && buyNow ? [buyNow] : cart;
  const totalQuantity = isBuyNow && buyNow ? buyNow.quantity : cart.reduce((s, i) => s + i.quantity, 0);
  const subtotal = isBuyNow && buyNow ? buyNow.unitPrice * buyNow.quantity : cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  return { isBuyNow, items, totalQuantity, subtotal };
}

const checkoutBuyNow = resolveCheckoutItems(true);
assert(checkoutBuyNow.items.length === 1, 'Checkout shows exactly 1 item for Buy Now');
assert(checkoutBuyNow.items[0].productId === 'prod-2', 'Checkout item is strictly the Buy Now item');
assert(checkoutBuyNow.totalQuantity === 3, 'Checkout total quantity is 3');
assert(checkoutBuyNow.subtotal === 1950, 'Checkout subtotal is 1950 (3 * 650)');

// Regular Checkout resolution test (when buyNow=0 or standard navigation)
const checkoutRegular = resolveCheckoutItems(false);
assert(checkoutRegular.items.length === 1, 'Standard checkout shows regular cart items');
assert(checkoutRegular.items[0].productId === 'prod-1', 'Standard checkout item is Item A');
assert(checkoutRegular.totalQuantity === 2, 'Standard checkout quantity is 2');
assert(checkoutRegular.subtotal === 1000, 'Standard checkout subtotal is 1000 (2 * 500)');

// Step 4: Complete Buy Now Order
console.log('\n--- 4. Completing Buy Now Order ---');
// After order placement:
saveBuyNowItem(null); // clearBuyNow()
assert(getBuyNowItem() === null, 'Buy Now item cleared after checkout');
assert(getCartItems().length === 1, 'Regular cart items remain completely intact after Buy Now order completion');
assert(getCartItems()[0].quantity === 2, 'Regular cart quantity remains 2');

// Step 5: Test Cart Drawer Route Change Hook logic
console.log('\n--- 5. Testing Cart Drawer Route Change Hook Logic ---');
let drawerOpen = true;
let prevPathname = '/shop';

function simulateRouteChangeEffect(newPathname) {
  if (prevPathname !== newPathname) {
    prevPathname = newPathname;
    drawerOpen = false; // closeDrawer()
  }
}

// Case 1: Component re-renders on the SAME page (e.g. quantity + / - or item added)
drawerOpen = true;
simulateRouteChangeEffect('/shop');
assert(drawerOpen === true, 'Drawer remains OPEN on re-renders on same route');

// Case 2: Route actually changes from /shop to /product/vest
simulateRouteChangeEffect('/product/vest');
assert(drawerOpen === false, 'Drawer closes when route actually changes');

console.log('\n================================================================');
console.log(`CART & BUY NOW TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log('================================================================\n');

if (failCount > 0) process.exit(1);
