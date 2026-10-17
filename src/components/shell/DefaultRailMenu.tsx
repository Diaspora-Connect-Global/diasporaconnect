'use client';

import { useTranslations } from 'next-intl';
import { ClipboardList, FileText, Headset, Info, Settings, ShieldCheck, type LucideIcon } from 'lucide-react';
import { DrawerRow, DrawerSection, MenuShell, usePageMenuActive } from '@/components/shell/RailMenu';
import { ITEM_ICONS } from '@/components/more/moreIcons';
import { MORE_RAIL_LINKS, MORE_SECTIONS } from '@/components/more/moreLinks';

const LEGAL_ICONS: Record<(typeof MORE_RAIL_LINKS)[number]['key'], LucideIcon> = {
  contact: Headset,
  settings: Settings,
  privacy: ShieldCheck,
  terms: FileText,
  about: Info,
};

function Lists() {
  const t = useTranslations('more');
  return (
    <>
      {MORE_SECTIONS.map((section) => (
        <DrawerSection key={section.key} id={`dm-${section.key}`} title={t(`sections.${section.key}.title`)}>
          {section.items.map((item) => (
            <DrawerRow key={item.key} href={item.href ?? '/more'} icon={ITEM_ICONS[item.key] ?? ClipboardList} tone={item.tone} label={t(`items.${item.key}.title`)} testId={`dm-${item.key}`} />
          ))}
        </DrawerSection>
      ))}
      <DrawerSection id="dm-help" title={t('rail.helpTitle')}>
        {MORE_RAIL_LINKS.map((l) => (
          <DrawerRow key={l.key} href={l.href} icon={LEGAL_ICONS[l.key]} label={l.key === 'contact' ? t('rail.helpTitle') : t(`rail.links.${l.key}`)} />
        ))}
      </DrawerSection>
    </>
  );
}

/**
 * Pages without side rails: the drawer holds the app's standard menu, built from the
 * More page's own data (moreLinks) so the two cannot drift. Rendered by the header
 * only while no page supplies its own drawer content.
 */
export function DefaultRailMenu() {
  const pageMenu = usePageMenuActive();
  if (pageMenu) return null;
  return (
    <MenuShell>
      <Lists />
    </MenuShell>
  );
}
