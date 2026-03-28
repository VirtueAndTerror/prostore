const items = [{ price: "19.99", qty: 1 }];

const config = {
  freeShippingThresholdCents: 10000,
  shippingFlatRateCents: 1000,
  taxRateBase: 0.15,
};

function calcPrice(items, config) {
  const itemsPriceCents = items.reduce((acc, item) => {
    const itemCents = Math.round(Number(item.price) * 100);
    return acc + (itemCents * item.qty)
  }, 0);

  const shippingPriceCents = itemsPriceCents > config.freeShippingThresholdCents ? 0 : config.shippingFlatRateCents;

  const taxPriceCents = Math.round(itemsPriceCents * config.taxRateBase);

  const totalPriceCents = itemsPriceCents + shippingPriceCents + taxPriceCents;

  return {
    itemsPrice: (itemsPriceCents / 100).toFixed(2),
    taxPrice: (taxPriceCents / 100).toFixed(2),
    shippingPrice: (shippingPriceCents / 100).toFixed(2),
    totalPrice: (totalPriceCents / 100).toFixed(2),
  };
}

console.log(calcPrice(items, config));
