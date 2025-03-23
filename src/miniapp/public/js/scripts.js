document.addEventListener('DOMContentLoaded', async () => {
    // Estado da aplicação
    const app = {
      toastTimeout: null,
      userId: null,
      chatId: null,
    };

    // Inicialização do Telegram WebApp
    if (window.Telegram && window.Telegram.WebApp) {
      Telegram.WebApp.ready();
    }

    // Elementos DOM
    const elements = {
      backdrop: document.getElementById('backdrop'),
      toast: document.getElementById('toast'),
      toastMessage: document.getElementById('toastMessage'),
      channelName: document.getElementById('channelName'),
      settingsIcon: document.getElementById('settingsIcon'),
      settingsMenu: document.getElementById('settingsMenu'),
      caption: document.getElementById('caption'),
      captionStatus: document.getElementById('captionStatus'),
      editCaptionBtn: document.getElementById('editCaptionBtn'),
      saveCaptionBtn: document.getElementById('saveCaptionBtn'),
      buttonsContainer: document.getElementById('buttonsContainer'),
      newButtonForm: document.getElementById('newButtonForm'),
      newButtonName: document.getElementById('newButtonName'),
      newButtonUrl: document.getElementById('newButtonUrl'),
      saveButtonBtn: document.getElementById('saveButtonBtn'),
      cancelButtonBtn: document.getElementById('cancelButtonBtn'),
      tabs: document.querySelectorAll('.tab'),
      tabContents: document.querySelectorAll('.tab-content'),
    };

    // Extrair ID do usuário e do chat da URL
    const url = document.URL.split("/");
    app.userId = url[3];
    splitChannel = url[4].split("?signature=")
    app.chatId = splitChannel[0]
    app.signature = splitChannel[1]
    
    
    const apiUrl = `/api/user/${app.userId}/${app.chatId}?signature=${app.signature}`;

    // Função para exibir toast de notificação
    function showToast(message, type = 'success') {
      clearTimeout(app.toastTimeout);
      elements.toastMessage.textContent = message;
      elements.toast.style.background = type === 'success' ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)';
      elements.toast.classList.add('show');
      
      app.toastTimeout = setTimeout(() => {
        elements.toast.classList.remove('show');
      }, 3000);
    }

    // Função para alternar o menu de configurações
    function toggleSettingsMenu() {
      const isHidden = elements.settingsMenu.classList.contains('hidden');
      elements.settingsMenu.classList.toggle('hidden');
      
      setTimeout(() => {
        elements.settingsMenu.classList.toggle('show', isHidden);
        elements.backdrop.classList.toggle('show', isHidden);
      }, 10);
    }

    // Função para carregar dados do canal
    async function loadChannelData() {
      try {
        elements.buttonsContainer.innerHTML = '<div class="loader"></div>';
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
          showToast('Erro ao carregar dados', 'error');
          closeApp();
          return;
        }

        const data = await response.json();
        
        const infoChannel = data.channel;
        const infoUser = data.user;

        // Atualizar nome do canal e legenda
        elements.channelName.textContent = infoChannel.title;
        elements.caption.value = infoChannel.caption || '';

        // Atualizar botões
        renderButtons(infoChannel.buttons, infoUser.collaborator);

        // Atualizar configurações de mídia
        if (infoChannel.settings) {
          document.getElementById('message').checked = infoChannel.settings.message || false;
          document.getElementById('sticker').checked = infoChannel.settings.sticker || false;
          document.getElementById('audio').checked = infoChannel.settings.audio || false;
          document.getElementById('video').checked = infoChannel.settings.video || false;
          document.getElementById('photo').checked = infoChannel.settings.photo || false;
          document.getElementById('gif').checked = infoChannel.settings.gif || false;
        }

      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showToast('Erro ao carregar dados', 'error');
      }
    }

    // Renderizar botões
    function renderButtons(buttons, isCollaborator) {
      elements.buttonsContainer.innerHTML = '';
      
      if (!buttons || buttons.length === 0) {
        elements.buttonsContainer.innerHTML = `
          <div class="empty-state">
            <p>Nenhum botão configurado</p>
          </div>
        `;
        return;
      }

      buttons.forEach((button, index) => {
        const buttonItem = document.createElement('div');
        buttonItem.className = 'button-item';
        buttonItem.dataset.buttonId = button.id;
        
        if (index === 0 && !isCollaborator) {
          buttonItem.innerHTML = `
            <div class="button-item-header">
              <div class="button-item-title">${button.text}</div>
            </div>
            <input type="text" value="${button.text}" readonly placeholder="Nome do Botão">
            <div style="height: 12px"></div>
            <input type="url" value="${button.url}" readonly placeholder="URL do Botão">
          `;
        } else {
          buttonItem.innerHTML = `
            <div class="button-item-header">
              <div class="button-item-title">${button.buttonId.slice(-5)}</div>
              <div class="button-item-actions">
                <button class="btn btn-icon btn-success btn-update" data-id="${button.buttonId}">
                  <i class="fas fa-save"></i>
                </button>
                <button class="btn btn-icon btn-danger btn-delete" data-id="${button.buttonId}">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
            <input type="text" value="${button.text}" placeholder="Nome do Botão">
            <div style="height: 12px"></div>
            <input type="url" value="${button.url}" placeholder="URL do Botão">
          `;
        }

        elements.buttonsContainer.appendChild(buttonItem);
      });
    }

    // Função para atualizar permissões
    async function updatePermissions(settings) {
      try {
        const response = await fetch(`/api/atualizar-permissao/${app.userId}/${app.chatId}?signature=${app.signature}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings)
        });

        if (response.ok) {
          showToast('Configurações atualizadas');
          return true;
        } else {
          showToast('Erro ao atualizar configurações', 'error');
          return false;
        }
      } catch (error) {
        showToast('Erro ao atualizar configurações', 'error');
        return false;
      }
    }

    // Função para alternar entre as abas
    function switchTab(tabName) {
      elements.tabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
      });

      elements.tabContents.forEach(content => {
        content.classList.toggle('hidden', content.id !== `${tabName}Tab`);
        content.classList.toggle('active', content.id === `${tabName}Tab`);
      });
    }

    // Função para fechar o app
    function closeApp() {
      if (window.Telegram && window.Telegram.WebApp) {
        Telegram.WebApp.close();
      } else {
        window.location.href = '/dashboard';
      }
    }

    // Event Listeners
    
    // Toggle do menu de configurações
    elements.settingsIcon.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleSettingsMenu();
    });

    // Fechar menu ao clicar no backdrop
    elements.backdrop.addEventListener('click', () => {
      elements.settingsMenu.classList.remove('show');
      setTimeout(() => {
        elements.settingsMenu.classList.add('hidden');
        elements.backdrop.classList.remove('show');
      }, 300);
    });

    // Tabs
    elements.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        switchTab(tab.dataset.tab);
      });
    });

    // Edita Permissao message
    document.getElementById('message').addEventListener('change', async (event) => {
      const settings = {
        message: event.target.checked,
        sticker: document.getElementById('sticker').checked,
        audio: document.getElementById('audio').checked,
        video: document.getElementById('video').checked,
        photo: document.getElementById('photo').checked,
        gif: document.getElementById('gif').checked,
      }

      await updatePermissions(settings)
      loadChannelData()
    })

    // Edita Permissao Sticker
    document.getElementById('sticker').addEventListener('change', async (event) => {
      const settings = {
        message: document.getElementById('message').checked,
        sticker: event.target.checked,
        audio: document.getElementById('audio').checked,
        video: document.getElementById('video').checked,
        photo: document.getElementById('photo').checked,
        gif: document.getElementById('gif').checked,
      }

      await updatePermissions(settings)
      loadChannelData()
    })

    // Edita Permissao audio
    document.getElementById('audio').addEventListener('change', async (event) => {
      const settings = {
        message: document.getElementById('message').checked,
        sticker: document.getElementById('sticker').checked,
        audio: event.target.checked,
        video: document.getElementById('video').checked,
        photo: document.getElementById('photo').checked,
        gif: document.getElementById('gif').checked,
      }

      await updatePermissions(settings)
      await loadChannelData()
    })

    // Edita Permissao Video
    document.getElementById('video').addEventListener('change', async (event) => {
      const settings = {
        message: document.getElementById('message').checked,
        sticker: document.getElementById('sticker').checked,
        audio: document.getElementById('audio').checked,
        video: event.target.checked,
        photo: document.getElementById('photo').checked,
        gif: document.getElementById('gif').checked,
      }

      await updatePermissions(settings)
      loadChannelData()
    })

    // Edita Permissao Photo
    document.getElementById('photo').addEventListener('change', async (event) => {
      const settings = {
        message: document.getElementById('message').checked,
        sticker: document.getElementById('sticker').checked,
        audio: document.getElementById('audio').checked,
        video: document.getElementById('video').checked,
        photo: event.target.checked,
        gif: document.getElementById('gif').checked,
      }

      await updatePermissions(settings)
      loadChannelData()
    })

    // Edita Permissao gif
    document.getElementById('gif').addEventListener('change', async (event) => {
      const settings = {
        message: document.getElementById('message').checked,
        sticker: document.getElementById('sticker').checked,
        audio: document.getElementById('audio').checked,
        video: document.getElementById('video').checked,
        photo: document.getElementById('photo').checked,
        gif: event.target.checked,
      }

      await updatePermissions(settings)
      loadChannelData()
    })

    // Editar Caption
    elements.editCaptionBtn.addEventListener('click', () => {
      elements.caption.removeAttribute('readonly');
      elements.caption.focus();
      elements.saveCaptionBtn.classList.remove('hidden');
      elements.editCaptionBtn.classList.add('hidden');
    });

    // Salvar Caption
    elements.saveCaptionBtn.addEventListener('click', async () => {
      const caption = elements.caption.value.trim();
      elements.captionStatus.classList.remove('hidden');
      elements.saveCaptionBtn.disabled = true;
      
      try {
        const response = await fetch(`/api/editar-legenda/${app.userId}/${app.chatId}?signature=${app.signature}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ legenda: caption })
        });

        if (response.ok) {
          showToast('Legenda atualizada com sucesso');
          elements.caption.setAttribute('readonly', true);
          elements.saveCaptionBtn.classList.add('hidden');
          elements.editCaptionBtn.classList.remove('hidden');
        } else {
          showToast('Erro ao atualizar legenda', 'error');
        }
      } catch (error) {
        showToast('Erro ao atualizar legenda', 'error');
      } finally {
        elements.captionStatus.classList.add('hidden');
        elements.saveCaptionBtn.disabled = false;
      }
    });

    // Novo botão
    elements.newButtonForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const buttonName = elements.newButtonName.value.trim();
      const buttonUrl = elements.newButtonUrl.value.trim();
      
      if (!buttonName || !buttonUrl) {
        showToast('Preencha todos os campos', 'error');
        return;
      }
      
      elements.saveButtonBtn.disabled = true;
      elements.saveButtonBtn.innerHTML = '<div class="loader"></div>';

      try {
        const response = await fetch(`/api/adicionar-botao/${app.userId}/${app.chatId}?signature=${app.signature}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ buttonName, buttonUrl })
        });

        if (response.ok) {
          showToast('Botão adicionado com sucesso');
          elements.newButtonName.value = '';
          elements.newButtonUrl.value = '';
          switchTab('buttons');
          await loadChannelData();
        } else {
          showToast('Erro ao adicionar botão', 'error');
        }
      } catch (error) {
        showToast('Erro ao adicionar botão', 'error');
      } finally {
        elements.saveButtonBtn.disabled = false;
        elements.saveButtonBtn.innerHTML = '<i class="fas fa-save"></i>&nbsp;Salvar';
      }
    });

    // Cancelar novo botão
    elements.cancelButtonBtn.addEventListener('click', () => {
      elements.newButtonName.value = '';
      elements.newButtonUrl.value = '';
      switchTab('buttons');
    });

    // Atualizar ou deletar botões
    elements.buttonsContainer.addEventListener('click', async (event) => {
      const button = event.target.closest('.btn');
      if (!button) return;
      
      const buttonId = button.dataset.id;
      const buttonItem = button.closest('.button-item');
      
      if (button.classList.contains('btn-update')) {
        const nameInput = buttonItem.querySelector('input[type="text"]');
        const urlInput = buttonItem.querySelector('input[type="url"]');
        const buttonName = nameInput.value.trim();
        const buttonUrl = urlInput.value.trim();
        
        button.innerHTML = '<div class="loader"></div>';
        button.disabled = true;

        try {
          const response = await fetch(`/api/atualizar-botao/${app.userId}/${app.chatId}?signature=${app.signature}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ buttonName, buttonUrl, buttonId })
          });

          if (response.ok) {
            showToast('Botão atualizado com sucesso');
            loadChannelData();
          } else {
            showToast('Erro ao atualizar botão', 'error');
          }
        } catch        (error) {
            showToast('Erro ao atualizar botão', 'error');
          } finally {
            button.innerHTML = '<i class="fas fa-save"></i>&nbsp;Salvar';
            button.disabled = false;
          }
        } else if (button.classList.contains('btn-delete')) {
          const confirmation = await Swal.fire({
            title: 'Tem certeza?',
            text: 'Você não poderá desfazer essa ação.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sim, excluir!',
            cancelButtonText: 'Cancelar'
          });
  
          if (confirmation.isConfirmed) {
            try {
              const response = await fetch(`/api/deletar-botao/${app.userId}/${app.chatId}?signature=${app.signature}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ buttonId })
              });
  
              if (response.ok) {
                showToast('Botão excluído com sucesso');
                loadChannelData();
              } else {
                showToast('Erro ao excluir botão', 'error');
              }
            } catch (error) {
              showToast('Erro ao excluir botão', 'error');
            }
          }
        }
      });
  
      // Carregar dados do canal quando a página for carregada
      loadChannelData();
  });
  