import cliProgress from "cli-progress";
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

// Calculate averages using the interpercentile range method
function calculateAverageIPR ( prices, startPercent = 1, stopPercent = 10 )
{
   function percentify ( value )
   {
      if ( typeof ( value ) !== "number" )
         throw new TypeError( `Expected number, got ${ typeof ( value ) }` );
      value = Math.abs( value ) * 0.01;
      return value;
   }

   startPercent = percentify( startPercent );
   stopPercent = percentify( stopPercent );

   // Sort entries by price (ascending)
   prices.sort( ( a, b ) => a - b );

   // Calculate quarters for IPR
   const percentile1 = prices[ Math.floor( prices.length * startPercent ) ];
   const percentile2 = prices[ Math.floor( prices.length * stopPercent ) ];
   const interPercentileRange = percentile2 - percentile1;
   const threshold = 1.5 * interPercentileRange;
   // Filter
   const filteredPrices = prices.filter(
      price =>
         price >= percentile1 - threshold && price <= percentile2 + threshold
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

   const daySeconds = 86400 * 3;
   const salesHistoryData = await universalis.getSalesHistory(
      salesHistoryItems, worldID, daySeconds
   );
   const currentData = await universalis.getCurrentData(
      currentDataItems, worldID
   );

   console.log( "Calculating prices..." );
   const progBar = new cliProgress.SingleBar( {}, cliProgress.Presets.shades_classic );
   progBar.start( craftableItems.length, 0 );

   craftableItems.forEach( item =>
   {
      const itemData = salesHistoryData.items[ `${ item.id }` ];
      // Only calculate average if there are entries
      if ( itemData?.entries.length > 0 )
      {
         let prices = itemData.entries.map( entry => entry.pricePerUnit );
         const averagePrice = calculateAverageIPR( prices, 1, 3 );

         // Set item average price, sale velocity, and stack size
         item.averagePrice = Math.round( averagePrice );
         item.saleVelocity = itemData.regularSaleVelocity;
         let popularStackSize
            = Object.entries(
               itemData.stackSizeHistogram
            ).sort( ( a, b ) => b[ 1 ] - a[ 1 ] )[ 0 ][ 0 ];
         popularStackSize = parseInt( popularStackSize );
         item.popularStackSize = popularStackSize;

         // (Decimal) Percentage of sales that were high quality
         item.hqSalePercentage = (
            itemData.hqSaleVelocity / itemData.regularSaleVelocity
         );

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
         item.unitProfit = null;
         item.profitabilityScore = null;
      }

      progBar.increment( 1 );
   } );

   progBar.stop();

   craftableItems.sort(
      ( a, b ) => a.profitabilityScore - b.profitabilityScore );
   return craftableItems;
}
