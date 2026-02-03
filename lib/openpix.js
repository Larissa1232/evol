// OpenPix support removed. This module remains as a shim to provide
// a clear runtime error if any code still imports it. Remove imports
// from codebase and delete this file when ready.

function _missing() {
  const e = new Error('OpenPix support has been removed from this project');
  e.code = 'OPENPIX_REMOVED';
  throw e;
}

module.exports = { createCharge: _missing };
