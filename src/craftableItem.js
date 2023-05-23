class craftableItem
{
   constructor ( rawItem )
   {
      this.name = rawItem.Name;
      this.recipeLevel = rawItem.RecipeLevelTable.ClassJobLevel;
      this.id = rawItem.ItemResultTargetID[ 0 ];
      this.job = rawItem.ClassJob.Abbreviation;
      this.ingredients = [];
      for ( let i = 0; i < 10; i++ )
      {
         let itemName = eval( `rawItem.ItemIngredient${ i }.Name` );
         let itemQuantity = eval( "rawItem.AmountIngredient" + i );
         let itemID = eval( `rawItem.ItemIngredient${ i }TargetID[0]` );

         // Skip if the ingredient slot is empty
         if ( itemQuantity > 0 && itemID > 0 )
         {
            this.ingredients.push( {
               name: itemName,
               quantity: itemQuantity,
               id: itemID,
               slot: i
            } );
         }
      }
   }
}

export default craftableItem;
