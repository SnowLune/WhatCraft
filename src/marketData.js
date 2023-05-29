import { universalis } from "./apiService.js";

// Calculate averages using the interquartile range method
function calculateAverageIQR ( prices )
{
   // Sort entries by price (ascending)
   prices.sort( ( a, b ) => a - b );

   // Calculate quarters for IQR
   const quarter1 = prices[ Math.floor( prices.length * 0.25 ) ];
   const quarter3 = prices[ Math.floor( prices.length * 0.75 ) ];
   const interQuartileRange = quarter3 - quarter1;
   const threshold = 1.5 * interQuartileRange;
   // Filter
   const filteredPrices = prices.filter(
      price =>
         price >= quarter1 - threshold && price <= quarter3 + threshold
   );
   // Calculate sum of prices after filtering
   const priceSum = filteredPrices.reduce(
      ( accumulator, price ) => accumulator + price, 0
   );
   // Calculate average price
   const averagePrice = priceSum / filteredPrices.length;

   return averagePrice;
}

export function calculateProfit ( craftableItem )
{
   let unitProfit;
   let profitabilityScore;

   craftableItem.ingredients.forEach( ingredient =>
   {
      ingredient.totalPrice = ingredient.averagePrice * ingredient.quantity;
   } );

   let ingredientPrices = craftableItem.ingredients.map(
      ingredient => ingredient.totalPrice );
   let craftingPriceTotal = ingredientPrices.reduce(
      ( acc, price ) => acc + price, 0 );
   unitProfit = craftableItem.averagePrice - craftingPriceTotal;
   profitabilityScore = unitProfit * craftableItem.saleVelocity;

   craftableItem.ingredientPriceTotal = craftingPriceTotal;
   craftableItem.unitProfit = unitProfit;
   craftableItem.profitabilityScore = profitabilityScore;
}

export async function getCraftableItemsMarketData
   ( craftableItems, worldID )
{
   let salesHistoryItems = [];
   let currentDataItems = [];
   craftableItems.forEach( item =>
   {
      item.ingredients.forEach( ingredient =>
      {
         // get ingredient market data and assign it, do avg math
         if ( !currentDataItems.includes( ingredient.id ) )
            currentDataItems.push( ingredient.id );
      } );
      if ( !salesHistoryItems.includes( item.id ) )
         salesHistoryItems.push( item.id );
   } );

   const weekInSeconds = 86400 * 7;
   const salesHistoryData = await universalis.getSalesHistory(
      salesHistoryItems, worldID, weekInSeconds
   );
   const currentData = await universalis.getCurrentData(
      currentDataItems, worldID
   );

   craftableItems.forEach( item =>
   {
      const itemData = salesHistoryData.items[ `${ item.id }` ];
      // Only calculate average if there are entries
      if ( itemData?.entries.length > 0 )
      {
         let prices = itemData.entries.map( entry => entry.pricePerUnit );
         const averagePrice = calculateAverageIQR( prices );
         // Set item average price and sale velocity
         item.averagePrice = Math.round( averagePrice );
         item.saleVelocity = itemData.regularSaleVelocity;

         item.ingredients.forEach( ingredient =>
         {
            const ingredientData = currentData.items[ `${ ingredient.id }` ];
            // Accumulate listing and recent history entry sale prices
            const ingredientPrices = [];
            const listingPrices = ingredientData.listings.map(
               listing => listing.pricePerUnit
            );
            const historyPrices = ingredientData.recentHistory.map(
               entry => entry.pricePerUnit
            );
            ingredientPrices.push( ...listingPrices, ...historyPrices );
            // Get average ingredient price
            const averagePrice = calculateAverageIQR( ingredientPrices );
            ingredient.averagePrice = Math.round( averagePrice );
         } );

         // Calculate Profit
         calculateProfit( item );
      }
      else
      {
         item.averagePrice = null;
         item.unitProfit = 0;
         item.profitabilityScore = 0;
      }
   } );

   craftableItems.sort(
      ( a, b ) => a.profitabilityScore - b.profitabilityScore );
   return craftableItems;
}
