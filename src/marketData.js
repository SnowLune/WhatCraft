export class itemMarketData
{
   constructor ( itemData )
   {
      this.name = itemData.name;
      this.id = itemData.id;
      this.ingredients = itemData.ingredients;

      this.ingredients.forEach( ingredient =>
      {
         // `slot` is irrelevant and unnecessary for market purposes
         delete ingredient.slot;
         ingredient.ingredientPriceAverage = 0;
      } );
      this.itemPriceAverage = 0;
      this.itemCraftingCost = 0;
   }



   get wholeProfit ()
   {
      return this.itemPriceAverage - this.itemCraftingCost;
   }
}
