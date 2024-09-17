<script lang="ts">
    export let content: string;
  
    function shareContent() {
      const text = encodeURIComponent(content);
      const whatsappUrl = `https://wa.me/?text=${text}`;
      const twitterUrl = `https://twitter.com/intent/tweet?text=${text}`;
      const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${text}`;
      
      if (navigator.share) {
        navigator.share({
          title: 'Compartir respuesta',
          text: content,
          url: window.location.href,
        }).catch((error) => console.log('Error sharing', error));
      } else {
        const shareWindow = window.open('', '_blank', 'width=600,height=400');
        if (shareWindow) {
          shareWindow.document.write(`
            <html>
              <head>
                <title>Compartir</title>
                <style>
                  body { font-family: Arial, sans-serif; padding: 20px; }
                  a { display: block; margin: 10px 0; padding: 10px; background-color: #f0f0f0; text-decoration: none; color: #333; border-radius: 5px; }
                </style>
              </head>
              <body>
                <h2>Compartir en:</h2>
                <a href="${whatsappUrl}" target="_blank">WhatsApp</a>
                <a href="${twitterUrl}" target="_blank">Twitter</a>
                <a href="${facebookUrl}" target="_blank">Facebook</a>
              </body>
            </html>
          `);
        }
      }
    }
  </script>
  
  <button
    on:click={shareContent}
    class="text-white py-1 px-2 rounded-full bg-slate-700 hover:bg-slate-800 transition-colors flex justify-center items-center"
    title="Compartir mensaje"
  >
  <svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5"><rect fill="none" height="256" width="256"/><circle cx="64" cy="128" fill="none" r="32" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><circle cx="176" cy="200" fill="none" r="32" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><circle cx="176" cy="56" fill="none" r="32" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" x1="149.1" x2="90.9" y1="73.3" y2="110.7"/><line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" x1="90.9" x2="149.1" y1="145.3" y2="182.7"/></svg> 
  Compartir
  </button>