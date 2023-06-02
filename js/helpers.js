import craftableItem from "./craftableItem.js";

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

export function downloadFile ( rawData, filename, type )
{
   const validTypes = [ "text/csv", "application/json" ];
   if ( !validTypes.includes( type.toLowerCase() ) )
      throw new Error( `Invalid type` );

   var data;

   switch ( type )
   {
      case "application/json":
         data = JSON.stringify( rawData, null, 2 );
         break;
      case "text/csv":
         break;
      default:
         break;
   }

   const blob = new Blob( [ data ], { type: type } );

   const downloadLink = document.createElement( 'a' );
   downloadLink.href = URL.createObjectURL( blob );
   downloadLink.download = filename;

   document.body.appendChild( downloadLink );
   downloadLink.click();
   document.body.removeChild( downloadLink );
}
