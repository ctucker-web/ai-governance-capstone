import type { AnchorHTMLAttributes } from 'react';
import { base } from './navigation';
export default function Link(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} href={props.href === '/' ? base.href : props.href} />;
}
