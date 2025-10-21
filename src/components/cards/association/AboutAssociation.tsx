import React from 'react';

export default function AdamsiTimes ()  {
  return (
    <div className="flex justify-center items-center  my-4">
      <div className="w-72 min-h-74 bg-surface-default rounded-lg shadow-sm p-4 flex flex-col gap-3">
        {/* Header Section */}
          <h2 className="text-lg font-semibold text-text-primary">About</h2>
        <div className="flex  items-start mb-1">
            <span className="text-sm font-semibold text-text-primary">2.1k</span>
            <span className="text-xs text-text-primary">members</span>
        </div>
        
        {/* Creation Date */}
        <div className='flex'>
        <div className="text-xs text-text-secondary ">Created Oct 1, 25</div>
          <span className="text-xs font-medium ">Public</span>

        </div>
        
        {/* Description Section */}
        <div className="">
          <p className=" ">
            The Adamsi Times is your go-to source for news and stories from the Ghanaian diaspora. 
            Stay connected with your roots, discover inspiring journeys, and engage in conversations 
            that shape our global community. Follow us for updates on cultural events, business 
            opportunities, and more.
          </p>
        </div>
        
        {/* Privacy Badge */}
       
      </div>
    </div>
  );
};

