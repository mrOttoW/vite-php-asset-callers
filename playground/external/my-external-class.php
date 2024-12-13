<?php

class MyExternalClass {
  protected function something( string $value ): string {
    if ( $value === 'text' ) {
      return getImage( 'desert.png' );
    } elseif ( $value === 'sofa' ) {
      return $sofa = getImage( 'sofa.png' );
    }

    return 'something';
  }

  private function folder(): string {
    return getSvg( 'folder.svg' );
  }

  protected function else(): array {
    return [];
  }

  public function render(): void {
    echo getSvg( 'gear.svg' );
  }

  public function html(): string {
    $html = getImage( 'building.png' );

    return $html;
  }
}
