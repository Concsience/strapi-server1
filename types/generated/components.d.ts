import type { Schema, Struct } from '@strapi/strapi';

export interface CartproductcardCartproductcard extends Struct.ComponentSchema {
  collectionName: 'components_cartproductcard_cartproductcards';
  info: {
    description: '';
    displayName: 'cartproductcard';
  };
  attributes: {
    art: Schema.Attribute.Relation<
      'oneToOne',
      'api::artists-work.artists-work'
    >;
    arttitle: Schema.Attribute.String;
    height: Schema.Attribute.String;
    price: Schema.Attribute.String;
    width: Schema.Attribute.String;
  };
}

export interface DescriptionsDescriptionBook extends Struct.ComponentSchema {
  collectionName: 'components_descriptions_description_books';
  info: {
    displayName: 'descriptionBook';
  };
  attributes: {
    text: Schema.Attribute.Text;
    title: Schema.Attribute.String;
  };
}

export interface DescriptionsLongdescriptions extends Struct.ComponentSchema {
  collectionName: 'components_descriptions_longdescriptions';
  info: {
    displayName: 'longdescriptions';
  };
  attributes: {
    AdditionalResources: Schema.Attribute.Text;
    Citation: Schema.Attribute.Text;
    Historyofthework: Schema.Attribute.Text;
    Provenance: Schema.Attribute.Text;
    SignificationEtImpact: Schema.Attribute.Text;
    TechnicalDetails: Schema.Attribute.Text;
  };
}

export interface DetailsDetails extends Struct.ComponentSchema {
  collectionName: 'components_details_details';
  info: {
    displayName: 'details';
    icon: 'archive';
  };
  attributes: {
    Couverture: Schema.Attribute.String;
    Datedeparution: Schema.Attribute.String;
    ISBN: Schema.Attribute.String;
    Papier: Schema.Attribute.String;
  };
}

export interface FooterFirstColumn extends Struct.ComponentSchema {
  collectionName: 'components_footer_first_columns';
  info: {
    description: '';
    displayName: 'first-column';
    icon: 'filter';
  };
  attributes: {
    text1: Schema.Attribute.String;
    text2: Schema.Attribute.String;
    text3: Schema.Attribute.String;
    text4: Schema.Attribute.String;
    text5: Schema.Attribute.String;
    text6: Schema.Attribute.String;
    text7: Schema.Attribute.String;
  };
}

export interface FooterFooter extends Struct.ComponentSchema {
  collectionName: 'components_footer_footers';
  info: {
    description: '';
    displayName: 'Footer';
    icon: 'folder';
  };
  attributes: {
    columnImage: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
    columnText: Schema.Attribute.Component<'footer.first-column', true>;
    secondColumn: Schema.Attribute.Component<'footer.first-column', true>;
    thirdColumn: Schema.Attribute.Component<'footer.first-column', true>;
  };
}

export interface HeaderCol extends Struct.ComponentSchema {
  collectionName: 'components_header_cols';
  info: {
    displayName: 'col';
    icon: 'filter';
  };
  attributes: {
    text1: Schema.Attribute.String;
    text2: Schema.Attribute.String;
    text3: Schema.Attribute.String;
    text4: Schema.Attribute.String;
  };
}

export interface HeaderHeader extends Struct.ComponentSchema {
  collectionName: 'components_header_headers';
  info: {
    description: '';
    displayName: 'Header';
    icon: 'filter';
  };
  attributes: {
    lastcol: Schema.Attribute.Component<'header.col', true>;
    menu: Schema.Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    websiteName: Schema.Attribute.String;
  };
}

export interface HomepageHero1 extends Struct.ComponentSchema {
  collectionName: 'components_homepage_hero1s';
  info: {
    description: '';
    displayName: 'hero1';
    icon: 'cube';
  };
  attributes: {
    hero1Image: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
    hero1ImageMobile: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
    hero1Label2: Schema.Attribute.String;
    hero1Label3: Schema.Attribute.String;
    hero1label4: Schema.Attribute.String;
    hero1Text: Schema.Attribute.String;
  };
}

export interface HomepageHero2 extends Struct.ComponentSchema {
  collectionName: 'components_homepage_hero2s';
  info: {
    description: '';
    displayName: 'hero2';
    icon: 'cube';
  };
  attributes: {
    hero2Image: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
    hero2ImageMobile: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
    hero2Label: Schema.Attribute.String;
  };
}

export interface HomepageHero3 extends Struct.ComponentSchema {
  collectionName: 'components_homepage_hero3s';
  info: {
    description: '';
    displayName: 'hero3';
    icon: 'cube';
  };
  attributes: {
    hero3image: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
    hero3ImageMobile: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
    hero3label1: Schema.Attribute.String;
    hero3label2: Schema.Attribute.String;
  };
}

export interface HomepageHero4 extends Struct.ComponentSchema {
  collectionName: 'components_homepage_hero4s';
  info: {
    description: '';
    displayName: 'hero4';
    icon: 'cube';
  };
  attributes: {
    hero4Image: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
    hero4ImageMobile: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
    hero4Label1: Schema.Attribute.String;
    hero4label2: Schema.Attribute.String;
    hero4Label3: Schema.Attribute.String;
  };
}

export interface HomepageHero5 extends Struct.ComponentSchema {
  collectionName: 'components_homepage_hero5s';
  info: {
    description: '';
    displayName: 'hero5';
    icon: 'cube';
  };
  attributes: {
    hero5Image: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
    hero5ImageMobile: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
    hero5label1: Schema.Attribute.String;
    hero5label2: Schema.Attribute.String;
  };
}

export interface LongDescriptionsProductsheetdescriptions
  extends Struct.ComponentSchema {
  collectionName: 'components_long_descriptions_productsheetdescriptions';
  info: {
    description: '';
    displayName: 'productsheetdescriptions';
  };
  attributes: {
    AdditionalResources: Schema.Attribute.Text;
    Citation: Schema.Attribute.Text;
    Historyofthework: Schema.Attribute.Text;
    SignificationEtImpact: Schema.Attribute.Text;
    TechnicalDetails: Schema.Attribute.Text;
    TechniquesPicturales: Schema.Attribute.Text;
  };
}

export interface ProductcardProductcard extends Struct.ComponentSchema {
  collectionName: 'components_productcard_productcards';
  info: {
    description: '';
    displayName: 'productcard';
  };
  attributes: {
    height: Schema.Attribute.String;
    price: Schema.Attribute.String;
    width: Schema.Attribute.String;
  };
}

export interface SevenArtPageDiscover extends Struct.ComponentSchema {
  collectionName: 'components_seven_art_page_discovers';
  info: {
    description: '';
    displayName: 'discover';
  };
  attributes: {
    background_discover1: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
    background_discover2: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
    commitment: Schema.Attribute.Component<
      'seven-art-page.our-commitment',
      false
    >;
    partners: Schema.Attribute.Component<'seven-art-page.our-parners', false>;
    title: Schema.Attribute.String;
  };
}

export interface SevenArtPageOurCommitment extends Struct.ComponentSchema {
  collectionName: 'components_seven_art_page_our_commitments';
  info: {
    displayName: 'our-commitment';
    icon: 'alien';
  };
  attributes: {};
}

export interface SevenArtPageOurParners extends Struct.ComponentSchema {
  collectionName: 'components_seven_art_page_our_parners';
  info: {
    description: '';
    displayName: 'our-parners';
    icon: '';
  };
  attributes: {
    artInstitute: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
    MuseeDor: Schema.Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    nationalGallery: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
    ruksMuseum: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
    theMet: Schema.Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
  };
}

export interface SevenArtPageSevenArtPage extends Struct.ComponentSchema {
  collectionName: 'components_seven_art_page_seven_art_pages';
  info: {
    description: '';
    displayName: 'category';
  };
  attributes: {
    description_category: Schema.Attribute.String;
    media_category: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios',
      true
    >;
    title_category: Schema.Attribute.String;
  };
}

export interface SigninSignIn extends Struct.ComponentSchema {
  collectionName: 'components_signin_sign_ins';
  info: {
    description: '';
    displayName: 'SignIN';
    icon: 'paperPlane';
  };
  attributes: {
    herotext1: Schema.Attribute.String;
    herotext2: Schema.Attribute.String;
    herotext3: Schema.Attribute.String;
    signInImage: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
    textfield: Schema.Attribute.Component<'signin.sign-in-form', true>;
  };
}

export interface SigninSignInForm extends Struct.ComponentSchema {
  collectionName: 'components_signin_sign_in_forms';
  info: {
    displayName: 'signInForm';
  };
  attributes: {
    Connexion: Schema.Attribute.String;
    signInEmail: Schema.Attribute.Email;
    signInPassword: Schema.Attribute.Password;
    signInText: Schema.Attribute.String;
  };
}

export interface SignupSignUp extends Struct.ComponentSchema {
  collectionName: 'components_signup_sign_ups';
  info: {
    description: '';
    displayName: 'SignUP';
    icon: 'filter';
  };
  attributes: {
    herotext: Schema.Attribute.String;
    herotext1: Schema.Attribute.String;
    herotext2: Schema.Attribute.String;
    signupfield: Schema.Attribute.Component<'signup.signupform', true>;
    SignUpHero: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
  };
}

export interface SignupSignupform extends Struct.ComponentSchema {
  collectionName: 'components_signup_signupforms';
  info: {
    description: '';
    displayName: 'signupform';
    icon: 'filter';
  };
  attributes: {
    createAcct: Schema.Attribute.String;
    email: Schema.Attribute.Email & Schema.Attribute.Required;
    firstName: Schema.Attribute.String;
    Nickname: Schema.Attribute.String;
    password: Schema.Attribute.Password;
    surname: Schema.Attribute.String;
    telephone: Schema.Attribute.String;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'cartproductcard.cartproductcard': CartproductcardCartproductcard;
      'descriptions.description-book': DescriptionsDescriptionBook;
      'descriptions.longdescriptions': DescriptionsLongdescriptions;
      'details.details': DetailsDetails;
      'footer.first-column': FooterFirstColumn;
      'footer.footer': FooterFooter;
      'header.col': HeaderCol;
      'header.header': HeaderHeader;
      'homepage.hero1': HomepageHero1;
      'homepage.hero2': HomepageHero2;
      'homepage.hero3': HomepageHero3;
      'homepage.hero4': HomepageHero4;
      'homepage.hero5': HomepageHero5;
      'long-descriptions.productsheetdescriptions': LongDescriptionsProductsheetdescriptions;
      'productcard.productcard': ProductcardProductcard;
      'seven-art-page.discover': SevenArtPageDiscover;
      'seven-art-page.our-commitment': SevenArtPageOurCommitment;
      'seven-art-page.our-parners': SevenArtPageOurParners;
      'seven-art-page.seven-art-page': SevenArtPageSevenArtPage;
      'signin.sign-in': SigninSignIn;
      'signin.sign-in-form': SigninSignInForm;
      'signup.sign-up': SignupSignUp;
      'signup.signupform': SignupSignupform;
    }
  }
}
