export class userData
{
   constructor ( job, level, dc, world, jobsData, dcData, worldData )
   {
      this.classJobID = job;
      this.classJobName = jobsData.find( j => j.ID == job ).Name;
      this.classJobName = (
         this.classJobName[ 0 ].toUpperCase()
            .concat( this.classJobName.slice( 1 ) )
      );
      this.classJobLevel = level;
      this.dataCenterID = dc;
      this.dataCenterName = dcData[ dc ].name;
      this.worldID = world;
      this.worldName = worldData.find( w => w.id == world ).name;
   }
}

export function saveData ( userData, itemsData )
{
   // const userAcceptsCookies = localStorage.getItem( "user-accepts-cookies" );
   const userAcceptsCookies = true;
   if ( !userAcceptsCookies )
      return;

   const recentSize = 10;
   let currentData = JSON.parse( localStorage.getItem( "user-data" ) );
   let previousData = JSON.parse( localStorage.getItem( "recent-user-data" ) );
   if ( previousData && currentData )
   {
      previousData.shift();
      previousData[ recentSize - 1 ] = currentData;
   }
   else if ( currentData )
   {
      previousData = [ currentData ];
   }
   else
   {
      currentData = userData;
   }

   localStorage.setItem( "user-data", JSON.stringify( currentData ) );
   localStorage.setItem( "recent-user-data", JSON.stringify( previousData ) );
   localStorage.setItem( "items-data", JSON.stringify( itemsData ) );
}
