import { universalis } from "./apiService";

export async function getCraftableItemsMarketData ( craftableItems )
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

   const salesHistory = await universalis.getSalesHistory( salesHistoryItems );
   const currentData = await universalis.getCurrentData( currentDataItems );

   return craftableItems;
}

export function calculateProfitability ( perUnitProfit, salesVelocity )
{
   return perUnitProfit * salesVelocity;
}
