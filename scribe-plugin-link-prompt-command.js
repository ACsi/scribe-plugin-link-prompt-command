define('scribe-default-link-prompt', [], function() {
  return function( attributes, resolve, reject) {
    var href = window.prompt('Enter a link.', attributes.href);

    if (href !== null) {
      attributes.href = href;
      resolve(attributes);
    } else {
      reject();
    }
  };
});

define('scribe-plugin-link-prompt-command',
    ['scribe-default-link-prompt'],
    function (defaultPrompt) {

  /**
   * This plugin adds a command for creating links, including a basic prompt.
   */

  
  return function (customPrompt) {
    return function (scribe) {
      var linkPromptCommand = new scribe.api.Command('createLink');

      scribe.commands.linkPrompt = linkPromptCommand;

      linkPromptCommand.nodeName = 'A';

      linkPromptCommand.queryState = function () {
        /**
         * We override the native `document.queryCommandState` for links because
         * the `createLink` and `unlink` commands are not supported.
         * As per: http://jsbin.com/OCiJUZO/1/edit?js,console,output
         */
        var selection = new scribe.api.Selection();
        return !! selection.getContaining(function (node) {
          return node.nodeName === this.nodeName;
        }.bind(this));
      };

      linkPromptCommand.execute = function () {
        var selection = new scribe.api.Selection();
        var range = selection.range;
        var anchorNode = selection.getContaining(function (node) {
          return node.nodeName === this.nodeName;
        }.bind(this));

        if (anchorNode) {
          range.selectNode(anchorNode);
          selection.selection.removeAllRanges();
          selection.selection.addRange(range);
        }

        var initialAttributes = {};
        if (anchorNode && anchorNode.hasAttributes()) {
          for (var i = 0; i < anchorNode.attributes.length; i++) {
            var attr = anchorNode.attributes[i];
            initialAttributes[attr.name] = attr.value;
          }
        }

        new Promise(function(resolve, reject) {
          if (customPrompt) {
            customPrompt(Object.create(initialAttributes), resolve, reject);
          } else {
            defaultPrompt(Object.create(initialAttributes), resolve, reject);
          }
        }).then(function(attributes) {
          // FIXME: I don't like how plugins like this do so much. Is there a way
          // to compose?

          if (attributes.href) {
            // Prepend href protocol if missing
            // If a http/s or mailto link is provided, then we will trust that an link is valid
            var urlProtocolRegExp = /^https?\:\/\//;
            var mailtoProtocolRegExp = /^mailto\:/;
            if (! urlProtocolRegExp.test(attributes.href) && ! mailtoProtocolRegExp.test(attributes.href)) {
              // For emails we just look for a `@` symbol as it is easier.
              if (/@/.test(attributes.href)) {
                var shouldPrefixEmail = window.confirm(
                    'The URL you entered appears to be an email address. ' +
                    'Do you want to add the required “mailto:” prefix?'
                    );
                if (shouldPrefixEmail) {
                  attributes.href = 'mailto:' + attributes.href;
                }
              } else {
                var shouldPrefixLink = window.confirm(
                    'The URL you entered appears to be a link. ' +
                    'Do you want to add the required “http://” prefix?'
                    );
                if (shouldPrefixLink) {
                  attributes.href = 'http://' + attributes.href;
                }
              }
            }

            // Restore the selection
            selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);

            scribe.api.SimpleCommand.prototype.execute.call(this, attributes.href);

            // Find the new anchor node
            if (!anchorNode) {
              anchorNode = range.commonAncestorContainer.previousSibling;
            } else {
              var anchorNodes = range.commonAncestorContainer.querySelectorAll('a');
              for (var i=0; i<anchorNodes.length; i++) {
                if (selection.containsNode(anchorNodes[i], true)) {
                  anchorNode = anchorNodes[i];
                  break;
                }
              }
            }

            for (var key in attributes) {
              if (attributes.hasOwnProperty(key)) {
                anchorNode.setAttribute(key, attributes[key]);
              }
            }
          }
        }.bind(this)).catch(function() {
          // Cancel
        });
      };
    };
  };

});

//# sourceMappingURL=scribe-plugin-link-prompt-command.js.map