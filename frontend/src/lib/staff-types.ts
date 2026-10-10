export interface StaffTypeInfo {
  code: string;
  label: string;
  nepali: string;
  displayText: string;
  badgeClass: string;
  icon: string;
}

export function getStaffTypeInfo(typeStr?: string, masterList: any[] = []): StaffTypeInfo {
  if (!typeStr || !typeStr.trim()) {
    return {
      code: '',
      label: 'Unassigned',
      nepali: 'प्रकार खुलाइएको छैन',
      displayText: 'खुलाइएको छैन (Unassigned)',
      badgeClass: 'bg-slate-100 text-slate-700 border border-slate-300',
      icon: '🏷️',
    };
  }

  const raw = typeStr.trim();
  const upper = raw.toUpperCase();

  // 1. Search in custom/master options if provided (StaffMasterOption with category 'TEACHER_TYPE')
  if (masterList && Array.isArray(masterList) && masterList.length > 0) {
    const found = masterList.find(
      (m: any) =>
        (m.code && m.code.toUpperCase() === upper) ||
        (m.title && m.title.toUpperCase() === upper) ||
        (m.titleNepali && m.titleNepali.trim() === raw)
    );

    if (found) {
      const codeKey = (found.code || found.title || '').toUpperCase();
      let badgeClass = 'bg-blue-50 text-blue-800 border border-blue-200';
      let icon = '📋';

      if (
        codeKey.includes('RASTRIYA') ||
        codeKey.includes('PERMANENT') ||
        codeKey.includes('GOV') ||
        codeKey.includes('STHAYI') ||
        codeKey.includes('स्थायी')
      ) {
        badgeClass = 'bg-indigo-50 text-indigo-700 border border-indigo-200';
        icon = '🏛️';
      } else if (
        codeKey.includes('NIJI') ||
        codeKey.includes('PRIVATE') ||
        codeKey.includes('स्रोत') ||
        codeKey.includes('SROTH')
      ) {
        badgeClass = 'bg-amber-50 text-amber-800 border border-amber-200';
        icon = '🤝';
      } else if (codeKey.includes('RAHAT') || codeKey.includes('राहत')) {
        badgeClass = 'bg-purple-50 text-purple-800 border border-purple-200';
        icon = '💜';
      } else if (codeKey.includes('KARAR') || codeKey.includes('CONTRACT') || codeKey.includes('करार')) {
        badgeClass = 'bg-cyan-50 text-cyan-800 border border-cyan-200';
        icon = '📑';
      } else if (
        codeKey.includes('BALBIKAS') ||
        codeKey.includes('ECD') ||
        codeKey.includes('बालविकास') ||
        codeKey.includes('शिशु')
      ) {
        badgeClass = 'bg-rose-50 text-rose-800 border border-rose-200';
        icon = '👶';
      } else if (
        codeKey.includes('SWAYAM') ||
        codeKey.includes('VOLUNTEER') ||
        codeKey.includes('स्वयंसेवक')
      ) {
        badgeClass = 'bg-emerald-50 text-emerald-800 border border-emerald-200';
        icon = '🌱';
      } else if (
        codeKey.includes('PRAVIDHIK') ||
        codeKey.includes('TECHNICAL') ||
        codeKey.includes('प्राविधिक')
      ) {
        badgeClass = 'bg-teal-50 text-teal-800 border border-teal-200';
        icon = '⚙️';
      } else if (
        codeKey.includes('ANUDAN') ||
        codeKey.includes('GRANT') ||
        codeKey.includes('अनुदान')
      ) {
        badgeClass = 'bg-violet-50 text-violet-800 border border-violet-200';
        icon = '⭐';
      }

      const display = found.titleNepali
        ? `${found.titleNepali} ${found.title && found.title !== found.titleNepali ? `(${found.title})` : ''}`
        : found.title || raw;

      return {
        code: found.code || found.title || raw,
        label: found.title || raw,
        nepali: found.titleNepali || found.title || raw,
        displayText: display,
        badgeClass,
        icon,
      };
    }
  }

  // 2. Built-in known codes and aliases
  if (
    upper === 'RASTRIYA' ||
    upper === 'PERMANENT' ||
    upper === 'GOVT' ||
    upper === 'GOVERNMENT' ||
    upper === 'स्थायी दरबन्दी' ||
    upper === 'स्थायी'
  ) {
    return {
      code: 'RASTRIYA',
      label: 'Permanent / Govt',
      nepali: 'स्थायी दरबन्दी',
      displayText: 'स्थायी दरबन्दी (Gov)',
      badgeClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
      icon: '🏛️',
    };
  }

  if (
    upper === 'NIJI_SROTH' ||
    upper === 'PRIVATE' ||
    upper === 'SCHOOL' ||
    upper === 'निजी स्रोत'
  ) {
    return {
      code: 'NIJI_SROTH',
      label: 'School Private',
      nepali: 'निजी स्रोत',
      displayText: 'निजी स्रोत (Private)',
      badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200',
      icon: '🤝',
    };
  }

  if (
    upper === 'RAHAT' ||
    upper === 'RAHAT_TEACHER' ||
    upper === 'राहत' ||
    upper === 'राहत अनुदान' ||
    upper === 'राहत कोटा'
  ) {
    return {
      code: 'RAHAT',
      label: 'Rahat Grant',
      nepali: 'राहत अनुदान',
      displayText: 'राहत अनुदान (Rahat)',
      badgeClass: 'bg-purple-50 text-purple-800 border border-purple-200',
      icon: '💜',
    };
  }

  if (
    upper === 'KARAR' ||
    upper === 'CONTRACT' ||
    upper === 'करार' ||
    upper === 'करार सेवा'
  ) {
    return {
      code: 'KARAR',
      label: 'Contract Service',
      nepali: 'करार सेवा',
      displayText: 'करार सेवा (Contract)',
      badgeClass: 'bg-cyan-50 text-cyan-800 border border-cyan-200',
      icon: '📑',
    };
  }

  if (
    upper === 'BALBIKAS' ||
    upper === 'ECD' ||
    upper === 'बालविकास' ||
    upper === 'बाल विकास' ||
    upper === 'SHISHU'
  ) {
    return {
      code: 'BALBIKAS',
      label: 'ECD / Nursery',
      nepali: 'बालविकास (ECD)',
      displayText: 'बालविकास (ECD)',
      badgeClass: 'bg-rose-50 text-rose-800 border border-rose-200',
      icon: '👶',
    };
  }

  if (
    upper === 'SWAYAMSEWAK' ||
    upper === 'VOLUNTEER' ||
    upper === 'स्वयंसेवक'
  ) {
    return {
      code: 'SWAYAMSEWAK',
      label: 'Volunteer Teacher',
      nepali: 'स्वयंसेवक शिक्षक',
      displayText: 'स्वयंसेवक (Volunteer)',
      badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
      icon: '🌱',
    };
  }

  if (
    upper === 'PRAVIDHIK' ||
    upper === 'TECHNICAL' ||
    upper === 'प्राविधिक धार' ||
    upper === 'प्राविधिक'
  ) {
    return {
      code: 'PRAVIDHIK',
      label: 'Technical Stream',
      nepali: 'प्राविधिक धार',
      displayText: 'प्राविधिक धार (Technical)',
      badgeClass: 'bg-teal-50 text-teal-800 border border-teal-200',
      icon: '⚙️',
    };
  }

  if (
    upper === 'SPECIAL_GRANT' ||
    upper === 'VISESH_ANUDAN' ||
    upper === 'विशेष अनुदान'
  ) {
    return {
      code: 'SPECIAL_GRANT',
      label: 'Special Grant',
      nepali: 'विशेष अनुदान',
      displayText: 'विशेष अनुदान (Special Grant)',
      badgeClass: 'bg-violet-50 text-violet-800 border border-violet-200',
      icon: '⭐',
    };
  }

  // 3. Fallback: dynamically format whatever is saved
  return {
    code: raw,
    label: raw,
    nepali: raw,
    displayText: raw,
    badgeClass: 'bg-slate-100 text-slate-800 border border-slate-300',
    icon: '📋',
  };
}
