import type { ComponentPropsWithoutRef } from 'react';

/** Shared semantic panel; native section attributes and accessibility are preserved. */
export function Section(props: ComponentPropsWithoutRef<'section'>) {
  return <section {...props} />;
}
