import craftableItem from "../src/craftableItem.js";

// Clean and restructure raw items data into a more easily usable format
export function raw2Clean ( rawItemsData )
{
   const craftableItems = [];
   rawItemsData.forEach( page =>
   {
      page.Results.forEach( item =>
      {
         craftableItems.push( new craftableItem( item ) );
      } );
   } );

   // Sort items in level order
   craftableItems.sort( ( a, b ) => a.recipeLevel - b.recipeLevel );
   return craftableItems;
}
