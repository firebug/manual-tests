<?php
// Fill up array with names
$a[]="Anna";
$a[]="Brittany";
$a[]="Cinderella";
$a[]="Diana";
$a[]="Eva";
$a[]="Fiona";
$a[]="Gunda";
$a[]="Hege";
$a[]="Inga";
$a[]="Johanna";
$a[]="Kitty";
$a[]="Linda";
$a[]="Nina";
$a[]="Ophelia";
$a[]="Petunia";
$a[]="Amanda";
$a[]="Raquel";
$a[]="Cindy";
$a[]="Doris";
$a[]="Eve";
$a[]="Evita";
$a[]="Sunniva";
$a[]="Tove";
$a[]="Unni";
$a[]="Violet";
$a[]="Liza";
$a[]="Elizabeth";
$a[]="Ellen";
$a[]="Wenche";
$a[]="Vicky";
$a[]="Anna_One";
$a[]="Brittany_One";
$a[]="Cinderella_One";
$a[]="Diana_One";
$a[]="Eva_One";
$a[]="Fiona_One";
$a[]="Gunda_One";
$a[]="Hege_One";
$a[]="Inga_One";
$a[]="Johanna_One";
$a[]="Kitty_One";
$a[]="Linda_One";
$a[]="Nina_One";
$a[]="Ophelia_One";
$a[]="Petunia_One";
$a[]="Amanda_One";
$a[]="Raquel_One";
$a[]="Cindy_One";
$a[]="Doris_One";
$a[]="Eve_One";
$a[]="Evita_One";
$a[]="Sunniva_One";
$a[]="Tove_One";
$a[]="Unni_One";
$a[]="Violet_One";
$a[]="Liza_One";
$a[]="Elizabeth_One";
$a[]="Ellen_One";
$a[]="Wenche_One";
$a[]="Vicky_One";
$a[]="Anna_Two";
$a[]="Brittany_Two";
$a[]="Cinderella_Two";
$a[]="Diana_Two";
$a[]="Eva_Two";
$a[]="Fiona_Two";
$a[]="Gunda_Two";
$a[]="Hege_Two";
$a[]="Inga_Two";
$a[]="Johanna_Two";
$a[]="Kitty_Two";
$a[]="Linda_Two";
$a[]="Nina_Two";
$a[]="Ophelia_Two";
$a[]="Petunia_Two";
$a[]="Amanda_Two";
$a[]="Raquel_Two";
$a[]="Cindy_Two";
$a[]="Doris_Two";
$a[]="Eve_Two";
$a[]="Evita_Two";
$a[]="Sunniva_Two";
$a[]="Tove_Two";
$a[]="Unni_Two";
$a[]="Violet_Two";
$a[]="Liza_Two";
$a[]="Elizabeth_Two";
$a[]="Ellen_Two";
$a[]="Wenche_Two";
$a[]="Vicky_Two";
$a[]="Anna_Three";
$a[]="Brittany_Three";
$a[]="Cinderella_Three";
$a[]="Diana_Three";
$a[]="Eva_Three";
$a[]="Fiona_Three";
$a[]="Gunda_Three";
$a[]="Hege_Three";
$a[]="Inga_Three";
$a[]="Johanna_Three";
$a[]="Kitty_Three";
$a[]="Linda_Three";
$a[]="Nina_Three";
$a[]="Ophelia_Three";
$a[]="Petunia_Three";
$a[]="Amanda_Three";
$a[]="Raquel_Three";
$a[]="Cindy_Three";
$a[]="Doris_Three";
$a[]="Eve_Three";
$a[]="Evita_Three";
$a[]="Sunniva_Three";
$a[]="Tove_Three";
$a[]="Unni_Three";
$a[]="Violet_Three";
$a[]="Liza_Three";
$a[]="Elizabeth_Three";
$a[]="Ellen_Three";
$a[]="Wenche_Three";
$a[]="Vicky_Three";

// get the q parameter from URL
$q=$_REQUEST["q"]; $hint="";

// lookup all hints from array if $q is different from ""
if ($q !== "") {
  $q=strtolower($q); $len=strlen($q);
  foreach($a as $name) {
    if (stristr($q, substr($name,0,$len))) {
      if ($hint==="") {
        $hint=$name;
      } else {
        $hint .= ", $name";
      }
    }
  }
}

// Output "no suggestion" if no hint were found
// or output the correct values
echo $hint==="" ? "no suggestion" : $hint;
?>
