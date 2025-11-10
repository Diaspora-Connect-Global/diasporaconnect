"use client"
import LoadingScreen from "@/components/custom/LoadingScreen";
import { useTranslations } from 'next-intl';

export default function Utils() {
  const t = useTranslations('common');

  return (
   <>
        <LoadingScreen  text={t('almostThere')}/>    
        
        </>
  )
}