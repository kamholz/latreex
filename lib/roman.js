var D = [1,5,10,50,100,500,1000];
var R = ['I','V','X','L','C','D','M'];

function roman(dec) {
  var r = '', d = dec;
  for (var i = 6; i >= 0; i--) {
  while (d >= D[i]) {d -= D[i]; r += R[i];}
    if (i > 0 && d >= D[i]-D[i-2+i%2]) {d -= D[i]-D[i-2+i%2]; r += R[i-2+i%2]+R[i];}
  }
  return r;
}

module.exports = roman;
