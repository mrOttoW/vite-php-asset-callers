<?php

function something(): string {
  return getImage( 'venice.png' );
}

function coffee(): array {
  return [
    'image' => getImage( 'coffee.png' ),
  ];
}

function laCity(): array {
  echo getImage( 'la.png' );
}
