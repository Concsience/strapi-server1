import type { Schema, Attribute } from '@strapi/strapi';

export interface FooterFooter extends Schema.Component {
  collectionName: 'components_footer_footers';
  info: {
    displayName: 'Footer';
    icon: 'filter';
  };
  attributes: {
    firstColumn: Attribute.Component<'footer.column-text'>;
  };
}

export interface FooterColumnText extends Schema.Component {
  collectionName: 'components_footer_column_texts';
  info: {
    displayName: 'columnText';
  };
  attributes: {
    text1: Attribute.String;
    text2: Attribute.String;
    text3: Attribute.String;
    text4: Attribute.String;
    text5: Attribute.String;
    text6: Attribute.String;
    text7: Attribute.String;
  };
}

declare module '@strapi/types' {
  export module Shared {
    export interface Components {
      'footer.footer': FooterFooter;
      'footer.column-text': FooterColumnText;
    }
  }
}
