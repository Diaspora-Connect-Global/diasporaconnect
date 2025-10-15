"use client"
import JoinCommunityCard from "@/components/cards/JoinCommunityCard"
import { DesignSystemShowcase } from "@/components/utils"
export default  function Utils() {
    return (
        <div className="p-4">
<JoinCommunityCard
  title="Ghana Innovation Hub"
  description="A platform that promotes innovation in collaboration and empowers innovative individuals."
  buttonText="Join community"
  onButtonClick={() => console.log('Join button clicked!')}
/>            
            
        </div>
    )
}